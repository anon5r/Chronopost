import type { ScheduledPost } from './types';

// Database Types
export interface ScheduledPostData {
  userId: string;
  content: {
    text: string;
    images?: string[];
    embed?: string;
  };
  scheduledAt: Date;
  status: string;
}

export interface DbOperations {
  userSession: {
    upsert(args: {
      where: { userId: string };
      create: { userId: string; identifier: string; appPassword: string };
      update: { identifier: string; appPassword: string };
    }): Promise<{ userId: string }>;
    findUnique(args: {
      where: { id: string };
      select: { userId: true };
    }): Promise<{ userId: string } | null>;
  };
  scheduledPost: {
    create(args: { data: ScheduledPostData }): Promise<ScheduledPost>;
    findMany(args: {
      where: { userId: string };
      orderBy: { scheduledAt: 'asc' | 'desc' };
    }): Promise<ScheduledPost[]>;
    findUnique(args: {
      where: { id: string };
      select?: { userId: true };
    }): Promise<ScheduledPost | null>;
    update(args: {
      where: { id: string };
      data: Partial<ScheduledPostData>;
    }): Promise<ScheduledPost>;
    delete(args: { where: { id: string } }): Promise<ScheduledPost>;
  };
  getScheduledPostCount(userId: string): Promise<number>;
  getScheduledPostsAt(date: Date): Promise<ScheduledPost[]>;
  logFailure(scheduledPostId: string, error: string): Promise<void>;
  markAsPublished(scheduledPostId: string): Promise<void>;
}

// Re-export the database client type
export type { DbOperations as Database };
