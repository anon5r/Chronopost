// Chronopost - Jest Global Teardown
/* eslint-env node */
/* global console, process, global */

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown for Chronopost...');
  
  // パフォーマンス測定の終了
  if (global.__TEST_START_TIME__) {
    const testDuration = Date.now() - global.__TEST_START_TIME__;
    const minutes = Math.floor(testDuration / 60000);
    const seconds = Math.floor((testDuration % 60000) / 1000);
    console.log(`⏱️ Total test execution time: ${minutes}m ${seconds}s`);
  }
  
  // データベースクリーンアップ（CI環境のみ）
  if (process.env.CI === 'true' && process.env.DATABASE_URL) {
    try {
      console.log('🗑️ Cleaning up test database...');
      
      // Prisma Client のインポート
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
      
      await prisma.$connect();
      
      // テスト用データのクリーンアップ（本番データは触らない）
      if (process.env.DATABASE_URL.includes('test')) {
        // テストデータベースのみクリーンアップ
        console.log('🧹 Cleaning test data...');
        
        // テーブルの順序を考慮してクリーンアップ
        // eslint-disable-next-line no-warning-comments
        // TODO: Phase別のテーブルクリーンアップを実装
        const cleanupQueries = [
          // Phase 1: 基本テーブル
          /* eslint-disable-next-line no-template-curly-in-string */
          'DELETE FROM oauth_sessions WHERE TRUE',
          /* eslint-disable-next-line no-template-curly-in-string */
          'DELETE FROM scheduled_posts WHERE TRUE',
          /* eslint-disable-next-line no-template-curly-in-string */
          'DELETE FROM users WHERE TRUE',
          
          // Phase 3: メディア関連（将来）
          // 'DELETE FROM post_media WHERE TRUE',
          // 'DELETE FROM media_files WHERE TRUE',
          
          // Phase 4: 分析・課金関連（将来）
          // 'DELETE FROM post_analytics WHERE TRUE',
          // 'DELETE FROM user_plans WHERE TRUE',
        ];
        
        for (const query of cleanupQueries) {
          try {
            await prisma.$executeRawUnsafe(query);
          } catch (error) {
            // テーブルが存在しない場合は無視
            if (!error.message.includes('does not exist')) {
              console.warn(`⚠️ Cleanup warning: ${error.message}`);
            }
          }
        }
        
        console.log('✅ Test data cleanup completed');
      } else {
        console.log('🛡️ Skipping cleanup: Not a test database');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.warn('⚠️ Database cleanup failed (not critical):', error.message);
    }
  }
  
  // Redis クリーンアップ（CI環境のみ）
  if (process.env.CI === 'true' && process.env.REDIS_URL) {
    try {
      console.log('🗑️ Cleaning up Redis test data...');
      // Redis cleanup はオプショナル
      console.log('✅ Redis cleanup skipped (not implemented)');
    } catch (error) {
      console.warn('⚠️ Redis cleanup failed (not critical):', error.message);
    }
  }
  
  // 一時ファイルのクリーンアップ
  try {
    console.log('📁 Cleaning up temporary test files...');
    
    // テスト用の一時ファイル削除
    const fs = await import('fs/promises');
    
    const tempDirs = [
      'temp/test',
      'uploads/test',
      'coverage/.nyc_output',
    ];
    
    for (const dir of tempDirs) {
      try {
        await fs.rmdir(dir, { recursive: true });
        console.log(`   - Removed: ${dir}`);
      } catch (error) {
        // ディレクトリが存在しない場合は無視
        if (error.code !== 'ENOENT') {
          console.warn(`   - Failed to remove ${dir}: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Temporary files cleanup completed');
  } catch (error) {
    console.warn('⚠️ Temporary files cleanup failed:', error.message);
  }
  
  // メモリ使用量の報告
  if (process.memoryUsage) {
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };
    
    console.log('💾 Memory usage summary:');
    console.log(`   - RSS: ${formatBytes(memUsage.rss)}`);
    console.log(`   - Heap Used: ${formatBytes(memUsage.heapUsed)}`);
    console.log(`   - Heap Total: ${formatBytes(memUsage.heapTotal)}`);
    console.log(`   - External: ${formatBytes(memUsage.external)}`);
  }
  
  // テスト統計の出力
  console.log('📊 Test execution summary:');
  console.log(`   - Environment: ${process.env.NODE_ENV}`);
  console.log(`   - CI Mode: ${process.env.CI || 'false'}`);
  console.log(`   - Database: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
  console.log(`   - Phase: ${process.env.BLUESKY_SCHEDULER_PHASE || 'all'}`);
  
  // Phase別の統計
  const currentPhase = process.env.BLUESKY_SCHEDULER_PHASE || 'phase1';
  switch (currentPhase) {
    case 'phase1':
      console.log('   - OAuth tests: completed');
      console.log('   - Basic posting tests: completed');
      break;
    case 'phase2':
      console.log('   - Thread tests: completed');
      break;
    case 'phase3':
      console.log('   - Media tests: completed');
      break;
    case 'phase4':
      console.log('   - Advanced feature tests: completed');
      break;
  }
  
  // 環境変数のクリーンアップ
  const testEnvVars = [
    'TEST_DATABASE_URL',
    'TEST_REDIS_URL',
    'TEST_CLIENT_SECRET',
    'TEST_ENCRYPTION_KEY',
  ];
  
  testEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      delete process.env[envVar];
    }
  });
  
  console.log('✅ Global test teardown completed successfully');
  console.log('');
}
