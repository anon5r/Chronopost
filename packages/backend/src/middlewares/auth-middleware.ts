import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { prisma } from '../lib/prisma';

/**
 * Authentication middleware for Hono routes
 * Verifies that the user is authenticated and attaches user info to the context
 */
export async function authMiddleware(c: Context, next: Next) {
  // Get the session ID from headers or cookies
  const sessionId = c.req.header('X-Session-ID') || getCookie(c, 'session_id');

  if (!sessionId) {
    return c.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: 401,
      },
      401
    );
  }

  try {
    // Fetch the session with the user
    const session = await prisma.oAuthSession.findUnique({
      where: {
        id: sessionId,
        isActive: true,
        refreshExpiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    // Check if session exists and is valid
    if (!session || !session.user) {
      return c.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired session',
          code: 401,
        },
        401
      );
    }

    // Attach user and session to the context
    c.set('user', session.user);
    c.set('sessionId', session.id);

    // Continue to the next middleware or route handler
    await next();
    return;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json(
      {
        error: 'SERVER_ERROR',
        message: 'Authentication failed',
        code: 500,
      },
      500
    );
  }
}
