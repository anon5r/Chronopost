/// <reference types="@cloudflare/workers-types" />
import type { ScheduledPostData } from './database';

// Env Types
export interface Bindings {
  DB: D1Database;
  JWT_SECRET: string;
  BLUESKY_SERVICE: string;
}

export interface Variables {
  userId: string;
}

export interface HonoEnv {
  Bindings: Bindings;
  Variables: Variables;
}

// Core Types
export interface ResponseBase {
  success: boolean;
}

export interface SuccessResponse<T> extends ResponseBase {
  success: true;
  data: T;
}

export interface ErrorResponse extends ResponseBase {
  success: false;
  error: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Auth Types
export interface BlueskyUser {
  did: string;
  handle: string;
}

export interface LoginResponse {
  token: string;
  user: BlueskyUser;
}

export interface LoginRequest {
  identifier: string;
  appPassword: string;
}

// Session Types
export interface UserSession {
  id: string;
  userId: string;
  identifier: string;
  appPassword: string;
  createdAt: Date;
  updatedAt: Date;
}

// Post Types
export interface ScheduledPost {
  id: string;
  userId: string;
  content: {
    text: string;
    images?: string[];
    embed?: string;
  };
  scheduledAt: Date;
  status: ScheduledPostStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ScheduledPostStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export interface CreatePostRequest {
  content: {
    text: string;
    images?: string[];
    embed?: string;
  };
  scheduledAt: string;
}

export interface UpdatePostRequest {
  content?: {
    text: string;
    images?: string[];
    embed?: string;
  };
  scheduledAt?: string;
}

export { ScheduledPostData };
