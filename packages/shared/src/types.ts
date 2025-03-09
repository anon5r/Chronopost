import { AppBskyFeedPost } from '@atproto/api';
import { z } from 'zod';

// Blueskyの投稿内容のスキーマ
export const PostContentSchema = z.object({
  text: z.string().min(1).max(300),
  // 画像ファイルのBase64エンコードされた文字列の配列
  images: z.array(z.string()).optional(),
  // 埋め込みリンクのURL
  embed: z.string().url().optional(),
});

export type PostContent = z.infer<typeof PostContentSchema>;

// 予約投稿のステータス
export enum ScheduledPostStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

// 予約投稿のスキーマ
export const ScheduledPostSchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: PostContentSchema,
  scheduledAt: z.date(),
  status: z.nativeEnum(ScheduledPostStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;

// 投稿失敗ログのスキーマ
export const FailureLogSchema = z.object({
  id: z.string(),
  scheduledPostId: z.string(),
  error: z.string(),
  createdAt: z.date(),
});

export type FailureLog = z.infer<typeof FailureLogSchema>;

// ユーザーセッションのスキーマ
export const UserSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  identifier: z.string(), // Blueskyのユーザー識別子
  appPassword: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

// APIレスポンスの型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
