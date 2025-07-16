import { Context, Next } from 'hono';

/**
 * Error handler middleware for Hono routes
 * Catches all errors and formats them consistently
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    // Continue to the next middleware or route handler
    await next();
    return;
  } catch (error) {
    console.error('Request error:', error);

    // Default error response
    let statusCode = 500;
    let errorCode = 'SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details = undefined;

    // Check if it's a known error type
    if (error instanceof Error) {
      message = error.message;

      // Custom error handling based on error name or message
      if (error.name === 'ValidationError' || error.message.includes('validation')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
      } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
      } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
      } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
      }

      // Include stack trace in development mode
      if (process.env.NODE_ENV === 'development') {
        details = error.stack;
      }
    }

    // Return consistent error response
    return c.json(
      {
        error: errorCode,
        message,
        code: statusCode,
        details,
      },
      statusCode as 400 | 401 | 403 | 404 | 500
    );
  }
}
