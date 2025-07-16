import * as crypto from 'crypto';
import { DPoPManager } from './dpop-manager';
import { TokenManager } from './token-manager';
import { SessionManager } from './session-manager';
import type {
  OAuthConfig,
  PKCECodes,
  OAuthToken,
  JsonWebKey,
} from 'shared';

/**
 * OAuthClient class - Handles OAuth authentication with Bluesky
 */
export class OAuthClient {
  private dPopManager: DPoPManager;
  private tokenManager: TokenManager;
  private sessionManager: SessionManager;
  private config: OAuthConfig;

  /**
   * Create a new OAuthClient instance
   * @param config OAuth configuration
   * @param encryptionKey Encryption key for token storage
   */
  constructor(config: OAuthConfig, encryptionKey: string) {
    this.config = config;
    this.dPopManager = new DPoPManager();
    this.tokenManager = new TokenManager(encryptionKey);
    this.sessionManager = new SessionManager();
  }

  /**
   * Generate PKCE (Proof Key for Code Exchange) codes
   * @returns PKCE codes
   */
  generatePKCE(): PKCECodes {
    // Generate a random code verifier (43-128 chars)
    const codeVerifier = crypto.randomBytes(64).toString('base64url').slice(0, 96); // Trim to reasonable length

    // Generate code challenge (S256 method required by Bluesky)
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256' as const,
    };
  }

  /**
   * Create an authorization URL for the OAuth flow
   * @param redirectUri Redirect URI for the callback
   * @returns Authorization URL and state
   */
  async createAuthorizationUrl(redirectUri: string): Promise<{
    url: string;
    state: string;
    codeVerifier: string;
  }> {
    // Generate PKCE codes
    const pkce = this.generatePKCE();

    // Generate and store state
    const state = this.sessionManager.createState(pkce.codeVerifier, redirectUri);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scope,
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
    });

    const url = `${this.config.authorizationEndpoint}?${params.toString()}`;

    return {
      url,
      state,
      codeVerifier: pkce.codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens
   * @param code Authorization code from callback
   * @param state State from callback
   * @param codeVerifier PKCE code verifier
   * @returns OAuth tokens
   */
  async exchangeCodeForTokens(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<OAuthToken> {
    // Verify state
    const stateData = this.sessionManager.getState(state);

    if (stateData.codeVerifier !== codeVerifier) {
      throw new Error('Code verifier mismatch');
    }

    // Generate DPoP key pair
    const dPopKeyPair = await this.dPopManager.generateKeyPair();

    // Create DPoP proof for token request
    const dPopProof = await this.dPopManager.createProof(
      'POST',
      this.config.tokenEndpoint,
      dPopKeyPair.privateKey
    );

    // Set up token request
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: stateData.redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier,
    });

    // Make token request
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        DPoP: dPopProof,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token request failed: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    // Format token response
    const tokens: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      dPopKeyPair,
    };

    return tokens;
  }

  /**
   * Refresh access token
   * @param refreshToken Refresh token
   * @param dPopPrivateKey DPoP private key
   * @returns New OAuth tokens
   */
  async refreshAccessToken(refreshToken: string, dPopPrivateKey: JsonWebKey): Promise<OAuthToken> {
    // Generate new DPoP key pair (recommended for security)
    const newDPoPKeyPair = await this.dPopManager.generateKeyPair();

    // Create DPoP proof for refresh request
    const dPopProof = await this.dPopManager.createProof(
      'POST',
      this.config.tokenEndpoint,
      dPopPrivateKey
    );

    // Set up refresh request
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      scope: this.config.scope,
    });

    // Make refresh request
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        DPoP: dPopProof,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Refresh token request failed: ${response.status} ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    // Format token response
    const tokens: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      dPopKeyPair: newDPoPKeyPair,
    };

    return tokens;
  }

  /**
   * Get user information from Bluesky API
   * @param accessToken Access token
   * @param dPopPrivateKey DPoP private key
   * @returns User information
   */
  async getUserInfo(
    accessToken: string,
    dPopPrivateKey: JsonWebKey
  ): Promise<{
    did: string;
    handle: string;
    displayName?: string;
  }> {
    const apiUrl = 'https://bsky.social/xrpc/com.atproto.server.getSession';

    // Create DPoP proof for API request
    const dPopProof = await this.dPopManager.createProof('GET', apiUrl, dPopPrivateKey);

    // Make API request
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        DPoP: dPopProof,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Get user info failed: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as {
      did: string;
      handle: string;
      displayName?: string;
    };

    return {
      did: data.did,
      handle: data.handle,
      displayName: data.displayName,
    };
  }

  /**
   * Store tokens and user information in the database
   * @param userId User ID
   * @param tokens OAuth tokens
   * @returns The created session
   */
  async storeTokens(userId: string, tokens: OAuthToken) {
    if (!tokens.dPopKeyPair) {
      throw new Error('DPoP key pair is required');
    }

    return this.tokenManager.storeTokens(
      userId,
      tokens,
      tokens.dPopKeyPair.privateKey,
      tokens.dPopKeyPair.publicKey
    );
  }

  /**
   * Get the DPoP manager instance
   */
  getDPoPManager(): DPoPManager {
    return this.dPopManager;
  }

  /**
   * Get the token manager instance
   */
  getTokenManager(): TokenManager {
    return this.tokenManager;
  }

  /**
   * Get the session manager instance
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }
}
