import { beforeAll } from 'vitest';

// Cloudflare WorkersのBindingsをモック
declare global {
  function getMiniflareBindings(): {
    JWT_SECRET: string;
    BLUESKY_SERVICE: string;
  };
}

beforeAll(() => {
  // 必要なグローバル変数とバインディングをセットアップ
  globalThis.getMiniflareBindings = () => ({
    JWT_SECRET: 'test-secret',
    BLUESKY_SERVICE: 'https://bsky.social',
  });
});
