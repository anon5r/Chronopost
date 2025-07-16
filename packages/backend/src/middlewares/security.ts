/**
 * Security Middleware for Chronopost Backend
 *
 * Implements comprehensive security headers and protections:
 * - DDoS protection
 * - XSS protection
 * - CSRF protection
 * - Content Security Policy
 * - OAuth/DPoP specific security measures
 */

import { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';

/**
 * CORS設定 - OAuth認証とフロントエンド連携用
 */
export const corsConfig = cors({
  origin: (origin, c) => {
    // 本番環境では厳密なドメイン制限
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      process.env.FRONTEND_URL_PRODUCTION || 'https://chronopost.example.com',
      // ステージング環境
      'https://staging.chronopost.example.com',
    ];

    // 開発環境では localhost を許可
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
    }

    return allowedOrigins.includes(origin || '') ? origin : null;
  },
  allowHeaders: [
    'Origin',
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    // DPoP関連ヘッダー
    'DPoP',
    'DPoP-Nonce',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['DPoP-Nonce'],
  credentials: true,
  maxAge: 86400, // 24時間
});

/**
 * セキュリティヘッダー設定
 * Helmet相当の機能をHonoで実装
 */
export const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://bsky.social', 'https://*.bsky.network'],
    fontSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
  crossOriginEmbedderPolicy: false, // OAuth認証で必要
  crossOriginOpenerPolicy: 'same-origin-allow-popups', // OAuth認証で必要
  crossOriginResourcePolicy: 'cross-origin',
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: 'strict-origin-when-cross-origin',
  xssFilter: true,
});

/**
 * レート制限設定
 * API エンドポイント別に制限を設定
 */
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return rateLimiter({
    windowMs,
    limit: maxRequests,
    standardHeaders: 'draft-6',
    // Redis使用時はここでstore設定
    // store: redisStore,
    keyGenerator: (c: Context) => {
      // IP + User-Agent でキー生成（より厳密な制限）
      const forwarded = c.req.header('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : c.req.header('x-real-ip') || 'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      return `${ip}:${userAgent.slice(0, 50)}`;
    },
    handler: (c: Context) => {
      return c.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          code: 429,
        },
        429
      );
    },
  });
};

/**
 * OAuth/DPoP専用のセキュリティミドルウェア
 */
export const oauthSecurityMiddleware = async (c: Context, next: Next) => {
  // DPoP nonce の追加
  if (c.req.path.startsWith('/api/auth/')) {
    const nonce = crypto.randomUUID();
    c.header('DPoP-Nonce', nonce);

    // セキュリティヘッダーの追加
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  }

  await next();
  return;
};

/**
 * API セキュリティミドルウェア
 * API エンドポイント全体に適用する共通セキュリティ対策
 */
export const apiSecurityMiddleware = async (c: Context, next: Next) => {
  // API特有のセキュリティヘッダー
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');

  // JSON API の Content-Type 強制
  if (c.req.method !== 'GET' && c.req.header('content-type')) {
    const contentType = c.req.header('content-type');
    if (!contentType?.includes('application/json')) {
      return c.json(
        {
          error: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json',
          code: 400,
        },
        400
      );
    }
  }

  await next();
  return;
};

/**
 * ログセキュリティミドルウェア
 * 機密情報をログから除外
 */
export const secureLogger = logger((message: string) => {
  // 機密情報をマスク
  let sanitized = message
    .replace(/("access_token":\s*")[^"]+/g, '$1***')
    .replace(/("refresh_token":\s*")[^"]+/g, '$1***')
    .replace(/("client_secret":\s*")[^"]+/g, '$1***')
    .replace(/("password":\s*")[^"]+/g, '$1***')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, '$1***')
    .replace(/(DPoP\s+)[A-Za-z0-9._-]+/g, '$1***');

  console.info(sanitized);
});

/**
 * エラーハンドリングミドルウェア
 * セキュリティ観点でのエラー情報制限
 */
export const secureErrorHandler = async (c: Context, next: Next) => {
  try {
    await next();
    return;
  } catch (error) {
    console.error('Application error:', error);

    // 本番環境では詳細なエラー情報を隠蔽
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (error instanceof Error) {
      return c.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: isDevelopment ? error.message : 'An unexpected error occurred',
          code: 500,
          ...(isDevelopment && { stack: error.stack }),
        },
        500
      );
    }

    return c.json(
      {
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        code: 500,
      },
      500
    );
  }
};

/**
 * 包括的なセキュリティミドルウェア設定
 */
export const setupSecurity = (app: any) => {
  // 基本セキュリティヘッダー
  app.use('*', securityHeaders);

  // CORS設定
  app.use('*', corsConfig);

  // セキュアログ
  app.use('*', secureLogger);

  // エラーハンドリング
  app.use('*', secureErrorHandler);

  // レート制限（エンドポイント別）
  app.use('/api/auth/*', createRateLimiter(60, 60 * 1000)); // 1分間に60回
  app.use('/api/posts/*', createRateLimiter(300, 60 * 1000)); // 1分間に300回
  app.use('/api/*', createRateLimiter(1000, 60 * 1000)); // その他APIは1分間に1000回

  // OAuth専用セキュリティ
  app.use('/api/auth/*', oauthSecurityMiddleware);

  // API全体セキュリティ
  app.use('/api/*', apiSecurityMiddleware);
};

/**
 * Phase 3以降: メディア処理用セキュリティ設定
 */
export const mediaSecurityMiddleware = async (c: Context, next: Next) => {
  if (c.req.path.startsWith('/api/media/')) {
    // ファイルアップロード専用の制限
    const contentLength = c.req.header('content-length');
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (contentLength && parseInt(contentLength) > maxSize) {
      return c.json(
        {
          error: 'FILE_TOO_LARGE',
          message: 'File size exceeds 50MB limit',
          code: 413,
        },
        413
      );
    }

    // Content-Type検証
    const contentType = c.req.header('content-type');
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4', // Phase 4
      'video/webm', // Phase 4
    ];

    if (contentType && !allowedTypes.some(type => contentType.startsWith(type))) {
      return c.json(
        {
          error: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Unsupported file type',
          code: 415,
        },
        415
      );
    }
  }

  await next();
  return;
};

/**
 * Phase 4以降: 課金システム用セキュリティ設定
 */
export const billingSecurityMiddleware = async (c: Context, next: Next) => {
  if (c.req.path.startsWith('/api/billing/') || c.req.path.startsWith('/api/webhooks/')) {
    // Stripe Webhook用の特別な設定
    if (c.req.path.includes('/webhooks/stripe')) {
      // Stripe Signatureの検証は別途実装
      c.header('Cache-Control', 'no-cache');
    }

    // 課金関連は特に厳しいレート制限
    // 別途実装される予定
  }

  await next();
  return;
};
