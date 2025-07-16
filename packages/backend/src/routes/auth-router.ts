import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { OAuthClient } from '../services/oauth/oauth-client';
import { OAuthCallbackSchema } from 'shared';
import type { User } from '../services/oauth/session-manager';

// Create a router instance
const router = new Hono();

/**
 * Set up routes with OAuth client
 * @param oauthClient OAuthClient instance
 * @returns Router instance
 */
export function setupAuthRouter(oauthClient: OAuthClient) {
  /**
   * Start OAuth flow
   * GET /auth/login
   */
  router.get('/login', async c => {
    try {
      // Get the redirect URI from query parameters or use default
      const redirectUri =
        c.req.query('redirect_uri') || `${process.env.FRONTEND_URL}/auth/callback`;

      // Create authorization URL
      const { url, state, codeVerifier } = await oauthClient.createAuthorizationUrl(redirectUri);

      // Set state and code verifier in the session cookie
      setCookie(c, 'oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
      });

      setCookie(c, 'code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
      });

      // Return the authorization URL for redirection
      return c.json({ redirectUrl: url });
    } catch (error) {
      console.error('OAuth login error:', error);
      return c.json(
        {
          error: 'OAUTH_ERROR',
          message: 'Failed to initiate OAuth flow',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * OAuth callback
   * POST /auth/callback
   */
  router.post('/callback', async c => {
    try {
      // Get request body
      const body = await c.req.json();

      // Validate the callback parameters
      const result = OAuthCallbackSchema.safeParse(body);
      if (!result.success) {
        return c.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid callback parameters',
            code: 400,
            details: result.error.format(),
          },
          400
        );
      }

      const { code, state, codeVerifier } = result.data;

      // Get state from cookies for verification
      const storedState = getCookie(c, 'oauth_state');
      const storedCodeVerifier = getCookie(c, 'code_verifier');

      // Verify state and code verifier
      if (!storedState || storedState !== state) {
        return c.json(
          {
            error: 'OAUTH_ERROR',
            message: 'Invalid state parameter',
            code: 400,
          },
          400
        );
      }

      if (!storedCodeVerifier || storedCodeVerifier !== codeVerifier) {
        return c.json(
          {
            error: 'OAUTH_ERROR',
            message: 'Invalid code verifier',
            code: 400,
          },
          400
        );
      }

      // Exchange code for tokens
      const tokens = await oauthClient.exchangeCodeForTokens(code, state, codeVerifier);

      // Get user info
      if (!tokens.dPopKeyPair) {
        throw new Error('DPoP key pair is missing from tokens');
      }

      const userInfo = await oauthClient.getUserInfo(
        tokens.accessToken,
        tokens.dPopKeyPair.privateKey
      );

      // Create or update user in the database
      const sessionManager = oauthClient.getSessionManager();
      const user = await sessionManager.createOrUpdateUser({
        did: userInfo.did,
        handle: userInfo.handle,
        displayName: userInfo.displayName || '',
      });

      // Store tokens in the database
      const session = await oauthClient.storeTokens(user.id, tokens);

      // Clear the OAuth cookies
      setCookie(c, 'oauth_state', '', { maxAge: 0 });
      setCookie(c, 'code_verifier', '', { maxAge: 0 });

      // Set the session cookie
      setCookie(c, 'session_id', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      // Return user info and session
      return c.json({
        user: {
          id: user.id,
          did: user.did,
          handle: user.handle,
          displayName: user.displayName,
        },
        sessionId: session.id,
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      return c.json(
        {
          error: 'OAUTH_ERROR',
          message: 'OAuth callback failed',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * Logout
   * POST /auth/logout
   */
  router.post('/logout', async c => {
    try {
      // Get the session ID from cookies or header
      const sessionId = getCookie(c, 'session_id') || c.req.header('X-Session-ID');

      if (!sessionId) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'No active session',
            code: 401,
          },
          401
        );
      }

      // Revoke the session
      const tokenManager = oauthClient.getTokenManager();
      await tokenManager.revokeSession(sessionId);

      // Clear the session cookie
      setCookie(c, 'session_id', '', { maxAge: 0 });

      return c.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Logout failed',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * Get user profile
   * GET /auth/profile
   */
  router.get('/profile', async c => {
    try {
      // Get user from context (set by auth middleware)
      const user = c.get('user') as User | undefined;
      if (!user) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            code: 401,
          },
          401
        );
      }

      // Return user profile
      return c.json({
        user: {
          id: user.id,
          did: user.did,
          handle: user.handle,
          displayName: user.displayName || '',
        },
      });
    } catch (error) {
      console.error('Profile error:', error);
      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to get profile',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  return router;
}
