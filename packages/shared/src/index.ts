import { z } from 'zod';

// Blueskyの投稿内容のスキーマ
export const PostContentSchema = z.object({
  text: z.string().min(1).max(300),
  images: z.array(z.string()).optional(),
  embed: z.string().url().optional(),
});

export type PostContent = z.infer<typeof PostContentSchema>;

// 予約投稿のステータス
export enum ScheduledPostStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

// 予約投稿の検証用ユーティリティ
export const validateScheduledPost = {
  // 2週間以内の予約かどうかチェック
  isWithinTwoWeeks: (date: Date): boolean => {
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    return date <= twoWeeksFromNow;
  },

  // ユーザーの予約投稿数が制限以内かチェック
  isWithinPostLimit: (currentCount: number): boolean => {
    const MAX_POSTS = 5;
    return currentCount < MAX_POSTS;
  },
};

// 日付操作ユーティリティ
export const dateUtils = {
  // 日付を分単位で切り捨てる（秒以下を0にする）
  truncateToMinute: (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  },

  // 指定された日時が現在時刻と一致するかチェック（分単位で比較）
  isTimeMatch: (scheduledDate: Date): boolean => {
    const now = new Date();
    return (
      scheduledDate.getFullYear() === now.getFullYear() &&
      scheduledDate.getMonth() === now.getMonth() &&
      scheduledDate.getDate() === now.getDate() &&
      scheduledDate.getHours() === now.getHours() &&
      scheduledDate.getMinutes() === now.getMinutes()
    );
  },
};

// 型定義のエクスポート
export type {
  ScheduledPost,
  UserSession,
  FailureLog,
  ApiResponse
} from './types';
