/// <reference types="@cloudflare/workers-types" />

declare module '@chronopost/database' {
  import { Prisma } from '@prisma/client';

  interface ScheduledPost {
    id: string;
    userId: string;
    content: any;
    scheduledAt: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userSession: UserSession;
  }

  interface UserSession {
    id: string;
    userId: string;
    identifier: string;
    appPassword: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export const db: {
    getScheduledPostCount(userId: string): Promise<number>;
    getScheduledPostsAt(date: Date): Promise<Array<ScheduledPost & { userSession: UserSession }>>;
    logFailure(scheduledPostId: string, error: string): Promise<void>;
    markAsPublished(scheduledPostId: string): Promise<void>;
  };

  export type { ScheduledPost, UserSession };
}

declare module '@chronopost/shared' {
  export const dateUtils: {
    truncateToMinute(date: Date): Date;
    isTimeMatch(scheduledDate: Date): boolean;
  };
}

declare module '@atproto/lexicon' {
  export interface BlobRef {
    $type: string;
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  }
}
