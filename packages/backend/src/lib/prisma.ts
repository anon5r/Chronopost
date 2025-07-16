/**
 * Prisma Client Configuration
 * セキュリティとパフォーマンスを重視した設定
 */

import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client の設定オプション
 * セキュリティベストプラクティスに基づく設定
 */
const prismaOptions = {
  // ログレベル設定（セキュリティ重視）
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event', 
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ] as const,
  
  // エラーフォーマット（本番環境では詳細を隠蔽）
  errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
  
  // データプロキシ設定（Railway等のサーバーレス環境用）
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
} as const;

/**
 * Prisma Client インスタンス
 * グローバルで単一インスタンスを使用（接続プール最適化）
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

// 開発環境でのホットリロード対応
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * セキュアなログ設定
 * 機密情報を含む可能性のあるクエリログを適切に処理
 */
prisma.$on('query', (e) => {
  // 本番環境では詳細なクエリログを無効化
  if (process.env.NODE_ENV === 'development') {
    // 機密情報をマスク
    const sanitizedQuery = e.query
      .replace(/'[^']*password[^']*'/gi, "'***'")
      .replace(/'[^']*token[^']*'/gi, "'***'")
      .replace(/'[^']*secret[^']*'/gi, "'***'")
      .replace(/'[^']*key[^']*'/gi, "'***'");
    
    console.log(`Query: ${sanitizedQuery}`);
    console.log(`Duration: ${e.duration}ms`);
  }
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Warning:', e);
});

/**
 * データベース接続の健全性チェック
 */
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}> => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * トランザクション実行のヘルパー関数
 * エラーハンドリングとログを統合
 */
export const executeTransaction = async <T>(
  operations: (tx: PrismaClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const result = await prisma.$transaction(operations, {
      maxWait: options?.maxWait || 5000, // 5秒
      timeout: options?.timeout || 10000, // 10秒
    });
    
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Slow transaction detected: ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Transaction failed after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * OAuth セッション用の安全なクエリヘルパー
 * 機密情報の暗号化/復号化を統合
 */
export const oauthSessionHelpers = {
  /**
   * セッション作成（トークン自動暗号化）
   */
  async createSession(data: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    dPopPrivateKey: string;
    dPopPublicKey: string;
    dPopKeyId: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    // 暗号化は別途実装される暗号化サービスを使用
    const { encryptToken } = await import('../services/crypto/encryption-service');
    
    return prisma.oAuthSession.create({
      data: {
        ...data,
        accessToken: await encryptToken(data.accessToken),
        refreshToken: await encryptToken(data.refreshToken),
        dPopPrivateKey: await encryptToken(data.dPopPrivateKey),
      },
    });
  },

  /**
   * アクティブセッション取得（トークン自動復号化）
   */
  async getActiveSession(userId: string) {
    const session = await prisma.oAuthSession.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    if (!session) return null;

    // 復号化は別途実装される暗号化サービスを使用
    const { decryptToken } = await import('../services/crypto/encryption-service');

    return {
      ...session,
      accessToken: await decryptToken(session.accessToken),
      refreshToken: await decryptToken(session.refreshToken),
      dPopPrivateKey: await decryptToken(session.dPopPrivateKey),
    };
  },

  /**
   * セッション無効化
   */
  async revokeSession(sessionId: string, reason?: string) {
    return prisma.oAuthSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  },

  /**
   * 期限切れセッションのクリーンアップ
   */
  async cleanupExpiredSessions() {
    const result = await prisma.oAuthSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { refreshExpiresAt: { lt: new Date() } },
        ],
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'EXPIRED',
      },
    });

    console.info(`Cleaned up ${result.count} expired sessions`);
    return result;
  },
};

/**
 * 投稿管理用の安全なクエリヘルパー
 */
export const postHelpers = {
  /**
   * スケジューラー用：実行可能な投稿取得
   */
  async getExecutablePosts(limit = 100) {
    return prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
        canExecute: true,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            did: true,
            handle: true,
            isActive: true,
            isBlocked: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  },

  /**
   * 投稿ステータス更新（監査ログ付き）
   */
  async updatePostStatus(
    postId: string,
    status: 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    metadata?: {
      errorMsg?: string;
      blueskyUri?: string;
      blueskyRkey?: string;
    }
  ) {
    return executeTransaction(async (tx) => {
      const updated = await tx.scheduledPost.update({
        where: { id: postId },
        data: {
          status,
          executedAt: status === 'COMPLETED' ? new Date() : undefined,
          errorMsg: metadata?.errorMsg,
          blueskyUri: metadata?.blueskyUri,
          blueskyRkey: metadata?.blueskyRkey,
          retryCount: status === 'FAILED' ? { increment: 1 } : undefined,
        },
      });

      // 監査ログ記録
      await tx.auditLog.create({
        data: {
          userId: updated.userId,
          action: 'UPDATE_POST_STATUS',
          entityType: 'ScheduledPost',
          entityId: postId,
          newValues: { status, ...metadata },
        },
      });

      return updated;
    });
  },

  /**
   * ユーザーの投稿数制限チェック
   */
  async checkUserPostLimit(userId: string, limit = 1000) {
    const count = await prisma.scheduledPost.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        isDeleted: false,
      },
    });

    return count < limit;
  },
};

/**
 * グレースフルシャットダウン
 * アプリケーション終了時の安全な接続切断
 */
export const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
    console.info('Prisma client disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting Prisma client:', error);
  }
};

// プロセス終了時の自動切断
process.on('SIGTERM', disconnectPrisma);
process.on('SIGINT', disconnectPrisma);

export default prisma;
