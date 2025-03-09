import { describe, expect, it } from 'vitest';
import {
  PostContentSchema,
  ScheduledPostSchema,
  ScheduledPostStatus,
  FailureLogSchema,
  UserSessionSchema,
} from '../src/types';

describe('PostContentSchema', () => {
  it('正常な投稿内容を検証できる', () => {
    const validContent = {
      text: 'テスト投稿です',
      images: ['base64EncodedImage'],
      embed: 'https://example.com',
    };

    const result = PostContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it('必須項目のみの投稿内容を検証できる', () => {
    const minimalContent = {
      text: 'テスト投稿です',
    };

    const result = PostContentSchema.safeParse(minimalContent);
    expect(result.success).toBe(true);
  });

  it('空の文字列は無効', () => {
    const invalidContent = {
      text: '',
    };

    const result = PostContentSchema.safeParse(invalidContent);
    expect(result.success).toBe(false);
  });

  it('300文字を超える文字列は無効', () => {
    const invalidContent = {
      text: 'a'.repeat(301),
    };

    const result = PostContentSchema.safeParse(invalidContent);
    expect(result.success).toBe(false);
  });

  it('無効なURLは検証に失敗する', () => {
    const invalidContent = {
      text: 'テスト投稿です',
      embed: 'invalid-url',
    };

    const result = PostContentSchema.safeParse(invalidContent);
    expect(result.success).toBe(false);
  });
});

describe('ScheduledPostSchema', () => {
  const validPost = {
    id: '123',
    userId: 'user123',
    content: {
      text: 'テスト投稿です',
    },
    scheduledAt: new Date(),
    status: ScheduledPostStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('正常な予約投稿を検証できる', () => {
    const result = ScheduledPostSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it('無効なステータスは検証に失敗する', () => {
    const invalidPost = {
      ...validPost,
      status: 'INVALID_STATUS',
    };

    const result = ScheduledPostSchema.safeParse(invalidPost);
    expect(result.success).toBe(false);
  });
});

describe('FailureLogSchema', () => {
  it('正常な失敗ログを検証できる', () => {
    const validLog = {
      id: '123',
      scheduledPostId: 'post123',
      error: 'エラーが発生しました',
      createdAt: new Date(),
    };

    const result = FailureLogSchema.safeParse(validLog);
    expect(result.success).toBe(true);
  });

  it('必須フィールドが欠けている場合は検証に失敗する', () => {
    const invalidLog = {
      id: '123',
      scheduledPostId: 'post123',
      createdAt: new Date(),
    };

    const result = FailureLogSchema.safeParse(invalidLog);
    expect(result.success).toBe(false);
  });
});

describe('UserSessionSchema', () => {
  it('正常なユーザーセッションを検証できる', () => {
    const validSession = {
      id: '123',
      userId: 'user123',
      identifier: 'user.bsky.social',
      appPassword: 'password123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = UserSessionSchema.safeParse(validSession);
    expect(result.success).toBe(true);
  });

  it('必須フィールドが欠けている場合は検証に失敗する', () => {
    const invalidSession = {
      id: '123',
      userId: 'user123',
      identifier: 'user.bsky.social',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = UserSessionSchema.safeParse(invalidSession);
    expect(result.success).toBe(false);
  });
});
