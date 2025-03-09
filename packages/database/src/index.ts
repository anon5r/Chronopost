import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Prismaクライアントのグローバルインスタンスを作成
// 開発環境でのホットリロード時に複数のインスタンスが作成されるのを防ぐ
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// 型定義のエクスポート
export * from '@prisma/client';

// データベース操作のヘルパー関数
export const db = {
  // ユーザーの予約投稿数を取得
  async getScheduledPostCount(userId: string): Promise<number> {
    return await prisma.scheduledPost.count({
      where: {
        userId,
        status: 'PENDING',
      },
    });
  },

  // 指定時刻の投稿予約を取得
  async getScheduledPostsAt(date: Date): Promise<Array<any>> {
    return await prisma.scheduledPost.findMany({
      where: {
        scheduledAt: date,
        status: 'PENDING',
      },
      include: {
        userSession: true,
      },
    });
  },

  // 失敗ログを記録
  async logFailure(scheduledPostId: string, error: string): Promise<void> {
    await prisma.failureLog.create({
      data: {
        scheduledPostId,
        error,
      },
    });

    await prisma.scheduledPost.update({
      where: {
        id: scheduledPostId,
      },
      data: {
        status: 'FAILED',
      },
    });
  },

  // 投稿成功時のステータス更新
  async markAsPublished(scheduledPostId: string): Promise<void> {
    await prisma.scheduledPost.update({
      where: {
        id: scheduledPostId,
      },
      data: {
        status: 'PUBLISHED',
      },
    });
  },
};
