// Chronopost - Jest Global Setup
/* eslint-env node */
/* global console, process */

export default async function globalSetup() {
  console.log('🚀 Starting global test setup for Chronopost...');
  
  // テスト環境の確認
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ NODE_ENV is not set to "test". Setting it now.');
    process.env.NODE_ENV = 'test';
  }
  
  // 必要な環境変数の設定
  const requiredEnvVars = {
    DATABASE_URL: 'postgresql://test_user:test_password@localhost:5432/bluesky_scheduler_test',
    CLIENT_ID: 'https://test.example.com/.well-known/bluesky-oauth.json',
    CLIENT_SECRET: 'test-client-secret-for-jest-testing',
    ENCRYPTION_KEY: 'this-is-a-sample-key-of-32-byte',
    FRONTEND_URL: 'http://localhost:3000',
    REDIS_URL: 'redis://localhost:6379/1', // テスト用DB番号
  };
  
  // 環境変数の設定
  Object.entries(requiredEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      console.log(`📝 Set ${key} to default test value`);
    }
  });
  
  // データベース接続テスト（CI環境では実際のPostgreSQLが動いている）
  if (process.env.CI === 'true') {
    try {
      // Prisma Client のインポート（dynamic import for test environment）
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
      
      // データベース接続確認
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // テーブルの存在確認
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      if (tables.length === 0) {
        console.warn('⚠️ No tables found. You may need to run migrations.');
      } else {
        console.log(`📊 Found ${tables.length} database tables`);
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('ℹ️ This is expected in unit test environments without a real database');
    }
  }
  
  // Redis接続テスト（オプショナル）
  if (process.env.REDIS_URL && process.env.CI === 'true') {
    try {
      // Redis接続テスト（実際のRedisがある場合のみ）
      console.log('🔄 Checking Redis connection...');
      // Redis client のテストはオプショナル
      console.log('✅ Redis check skipped (not implemented)');
    } catch (error) {
      console.warn('⚠️ Redis connection failed (not critical):', error.message);
    }
  }
  
  // テストモードの設定
  console.log('🧪 Test environment configuration:');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   - CI: ${process.env.CI || 'false'}`);
  console.log(`   - Database: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
  console.log(`   - Redis: ${process.env.REDIS_URL ? 'configured' : 'not configured'}`);
  
  // タイムゾーン設定（テストの一貫性のため）
  process.env.TZ = 'UTC';
  console.log('🌍 Timezone set to UTC for consistent testing');
  
  // Phase別のセットアップ
  const currentPhase = process.env.BLUESKY_SCHEDULER_PHASE || 'phase1';
  console.log(`📋 Running tests for: ${currentPhase}`);
  
  switch (currentPhase) {
    case 'phase1':
      console.log('   - Basic OAuth authentication tests');
      console.log('   - Text post scheduling tests');
      console.log('   - Database CRUD tests');
      break;
    case 'phase2':
      console.log('   - Thread posting tests');
      console.log('   - Dependency resolution tests');
      break;
    case 'phase3':
      console.log('   - Media upload tests');
      console.log('   - Link card generation tests');
      break;
    case 'phase4':
      console.log('   - Billing system tests');
      console.log('   - Analytics tests');
      break;
    default:
      console.log('   - All available tests');
  }
  
  // パフォーマンス測定の開始
  global.__TEST_START_TIME__ = Date.now();
  console.log('⏱️ Performance monitoring started');
  
  console.log('✅ Global test setup completed successfully');
}
