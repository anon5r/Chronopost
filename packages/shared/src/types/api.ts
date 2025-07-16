import { z } from 'zod';

// User related types
export interface User {
  id: string;
  did: string;
  handle: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// OAuth related types
export interface OAuthSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  dPopPrivateKey: string;
  dPopPublicKey: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  isActive: boolean;
}

/* eslint-disable no-unused-vars */
export enum PostStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
/* eslint-enable no-unused-vars */

// Post related types
export interface ScheduledPost {
  id: string;
  userId: string;
  content: string;
  scheduledAt: Date;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  errorMsg?: string;
  retryCount: number;
  blueskyUri?: string;
  blueskyRkey?: string;
}

// API request/response types
export interface CreatePostRequest {
  content: string;
  scheduledAt: Date;
}

export interface UpdatePostRequest {
  content?: string;
  scheduledAt?: Date;
}

export interface PostResponse {
  post: ScheduledPost;
}

export interface PostsResponse {
  posts: ScheduledPost[];
  total: number;
  page: number;
  limit: number;
}

export interface OAuthLoginResponse {
  redirectUrl: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  codeVerifier: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: number;
  details?: unknown;
}

// Validation schemas using Zod
export const CreatePostSchema = z.object({
  content: z.string().min(1).max(300),
  scheduledAt: z.coerce.date().refine(date => date > new Date(), {
    message: 'Scheduled date must be in the future',
  }),
});

export const UpdatePostSchema = z
  .object({
    content: z.string().min(1).max(300).optional(),
    scheduledAt: z.coerce
      .date()
      .refine(date => date > new Date(), {
        message: 'Scheduled date must be in the future',
      })
      .optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  codeVerifier: z.string(),
});
