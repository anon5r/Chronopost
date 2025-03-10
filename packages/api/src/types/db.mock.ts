import type { ScheduledPost, UserSession } from '../types';

export interface DbMock {
  scheduledPost: {
    create(data: any): Promise<ScheduledPost>;
    findMany(query: any): Promise<ScheduledPost[]>;
    findUnique(query: any): Promise<ScheduledPost | null>;
    update(query: any): Promise<ScheduledPost>;
    delete(query: any): Promise<ScheduledPost>;
  };
  userSession: {
    upsert(data: any): Promise<UserSession>;
    findUnique(query: any): Promise<UserSession | null>;
  };
  getScheduledPostCount(userId: string): Promise<number>;
  getScheduledPostsAt(date: Date): Promise<ScheduledPost[]>;
  logFailure(scheduledPostId: string, error: string): Promise<void>;
  markAsPublished(scheduledPostId: string): Promise<void>;
}
