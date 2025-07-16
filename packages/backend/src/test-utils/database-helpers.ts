/**
 * Database Test Helpers
 * Prismaを使用したテストデータベースの管理
 */

import { PrismaClient } from '@prisma/client';
import type { UserProfile, ScheduledPostData } from '@chronopost/shared';
import { testUtils } from './index';

/**
 * テスト用Prismaクライアント
 * 分離されたテストデータベースを使用
 */
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/chronopost_test',
    },
  },
  log: process.env.DEBUG_TESTS === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * データベースクリーンアップユーティリティ
 */
export const databaseHelpers = {
  /**
   * すべてのテーブルをクリア
   * 外部キー制約を考慮した順序で削除
   */
  async cleanDatabase(): Promise<void> {
    const tables = [
      'audit_logs',
      'scheduled_posts',
      'oauth_sessions',
      'users',
      'system_configs',
    ];

    // トランザクション内で順次削除
    await testPrisma.$transaction(async (tx) => {
      for (const table of tables) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}"`);
      }
      
      // シーケンスのリセット（PostgreSQL）
      for (const table of tables) {
        try {
          await tx.$executeRawUnsafe(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1`);
        } catch (error) {
          // シーケンスが存在しない場合は無視
        }
      }
    });
  },

  /**
   * 基本的なテストデータをシード
   */
  async seedTestData(): Promise<{
    users: UserProfile[];
    posts: ScheduledPostData[];
  }> {
    // テストユーザーの作成
    const users = await Promise.all([
      testPrisma.user.create({
        data: {
          did: testUtils.mockUser.did,
          handle: testUtils.mockUser.handle,
          displayName: testUtils.mockUser.displayName,
          isActive: true,
          lastLoginAt: new Date(),
        },
      }),
      testPrisma.user.create({
        data: {
          did: 'did:plc:test-user-2',
          handle: 'testuser2.bsky.social',
          displayName: 'Test User 2',
          isActive: true,
        },
      }),
    ]);

    // テスト投稿の作成
    const posts = await Promise.all([
      testPrisma.scheduledPost.create({
        data: {
          userId: users[0].id,
          content: 'テスト投稿 1',
          scheduledAt: testUtils.addHours(new Date(), 1),
          status: 'PENDING',
        },
      }),
      testPrisma.scheduledPost.create({
        data: {
          userId: users[1].id,
          content: 'テスト投稿 2',
          scheduledAt: testUtils.addHours(new Date(), 2),
          status: 'PENDING',
        },
      }),
    ]);

    return { users, posts };
  },

  /**
   * 特定のユーザーのテストデータを作成
   */
  async createTestUser(overrides?: Partial<{
    did: string;
    handle: string;
    displayName: string;
    isActive: boolean;
  }>): Promise<UserProfile> {
    const userData = {
      did: `did:plc:test-${Math.random().toString(36).substr(2, 9)}`,
      handle: `testuser-${Math.random().toString(36).substr(2, 9)}.bsky.social`,
      displayName: 'Test User',
      isActive: true,
      ...overrides,
    };

    return await testPrisma.user.create({
      data: userData,
    });
  },

  /**
   * 特定の投稿のテストデータを作成
   */
  async createTestPost(
    userId: string,
    overrides?: Partial<{
      content: string;
      scheduledAt: Date;
      status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    }>
  ): Promise<ScheduledPostData> {
    const postData = {
      content: 'テスト投稿です',
      scheduledAt: testUtils.addHours(new Date(), 1),
      status: 'PENDING' as const,
      ...overrides,
    };

    return await testPrisma.scheduledPost.create({
      data: {
        userId,
        ...postData,
      },
    });
  },

  /**
   * OAuth セッションのテストデータを作成
   */
  async createTestOAuthSession(
    userId: string,
    overrides?: Partial<{
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
      isActive: boolean;
    }>
  ): Promise<any> {
    // 暗号化サービスが実装される前の簡易版
    const sessionData = {
      accessToken: 'encrypted-' + testUtils.mockAccessToken,
      refreshToken: 'encrypted-' + testUtils.mockRefreshToken,
      dPopPrivateKey: 'encrypted-private-key',
      dPopPublicKey: JSON.stringify(testUtils.mockDPoPKeyPair.publicKey),
      dPopKeyId: 'test-key-id',
      expiresAt: testUtils.addHours(new Date(), 1),
      refreshExpiresAt: testUtils.addDays(new Date(), 30),
      isActive: true,
      userAgent: 'Test User Agent',
      ipAddress: '127.0.0.1',
      ...overrides,
    };

    return await testPrisma.oAuthSession.create({
      data: {
        userId,
        ...sessionData,
      },
    });
  },

  /**
   * 監査ログのテストデータを作成
   */
  async createTestAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId?: string
  ): Promise<any> {
    return await testPrisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        newValues: { test: 'data' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent',
      },
    });
  },

  /**
   * データベース接続の確認
   */
  async checkConnection(): Promise<boolean> {
    try {
      await testPrisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  },

  /**
   * データベース統計の取得（デバッグ用）
   */
  async getDatabaseStats(): Promise<{
    users: number;
    posts: number;
    sessions: number;
    auditLogs: number;
  }> {
    const [users, posts, sessions, auditLogs] = await Promise.all([
      testPrisma.user.count(),
      testPrisma.scheduledPost.count(),
      testPrisma.oAuthSession.count(),
      testPrisma.auditLog.count(),
    ]);

    return { users, posts, sessions, auditLogs };
  },

  /**
   * テストトランザクションの実行
   */
  async runInTransaction<T>(
    operation: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await testPrisma.$transaction(operation);
  },
};

/**
 * テスト用のデータベースセットアップ・ティアダウン
 */
export const setupTestDatabase = () => {
  beforeAll(async () => {
    // データベース接続の確認
    const isConnected = await databaseHelpers.checkConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to test database');
    }
  });

  beforeEach(async () => {
    // 各テスト前にデータベースをクリーン
    await databaseHelpers.cleanDatabase();
  });

  afterAll(async () => {
    // テスト終了後にPrismaクライアントを切断
    await testPrisma.$disconnect();
  });
};

/**
 * パフォーマンステスト用のヘルパー
 */
export const performanceHelpers = {
  /**
   * 大量のテストデータを効率的に作成
   */
  async createBulkTestData(userCount = 100, postsPerUser = 10): Promise<void> {
    console.log(`Creating ${userCount} users with ${postsPerUser} posts each...`);
    
    const users = [];
    for (let i = 0; i < userCount; i++) {
      users.push({
        did: `did:plc:bulk-test-${i}`,
        handle: `bulkuser${i}.bsky.social`,
        displayName: `Bulk Test User ${i}`,
        isActive: true,
      });
    }

    // バルクインサート
    const createdUsers = await testPrisma.user.createMany({
      data: users,
    });

    // 投稿データの作成
    const posts = [];
    const userIds = await testPrisma.user.findMany({
      select: { id: true },
      where: { handle: { startsWith: 'bulkuser' } },
    });

    for (const user of userIds) {
      for (let j = 0; j < postsPerUser; j++) {
        posts.push({
          userId: user.id,
          content: `Bulk test post ${j} from user ${user.id}`,
          scheduledAt: testUtils.addHours(new Date(), Math.floor(Math.random() * 24)),
          status: 'PENDING' as const,
        });
      }
    }

    await testPrisma.scheduledPost.createMany({
      data: posts,
    });

    console.log(`Created ${userCount} users and ${posts.length} posts`);
  },

  /**
   * クエリパフォーマンスの測定
   */
  async measureQueryPerformance<T>(
    queryName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await operation();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // ナノ秒からミリ秒

    if (process.env.DEBUG_TESTS === 'true') {
      console.log(`Query "${queryName}" took ${duration.toFixed(2)}ms`);
    }

    return { result, duration };
  },
};

export default databaseHelpers;
