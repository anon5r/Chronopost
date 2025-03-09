/// <reference types="@cloudflare/workers-types" />

// Internal type imports
import type { HonoEnv } from './types';
import type { DbOperations, ScheduledPostData } from './database';

// Hono module augmentation
declare module 'hono' {
  interface Env extends HonoEnv {}
  interface ContextVariableMap extends HonoEnv['Variables'] {}
}

// Database module declaration
declare module '@chronopost/database' {
  interface DbClient extends DbOperations {}
  export const db: DbClient;
}

// Shared package declaration
declare module '@chronopost/shared' {
  import type { z } from 'zod';
  import type { ScheduledPostStatus } from './types';
  
  export const PostContentSchema: z.ZodObject<{
    text: z.ZodString;
    images: z.ZodOptional<z.ZodArray<z.ZodString>>;
    embed: z.ZodOptional<z.ZodString>;
  }>;

  export const validateScheduledPost: {
    isWithinTwoWeeks(date: Date): boolean;
    isWithinPostLimit(currentCount: number): boolean;
  };

  export { ScheduledPostStatus };
}

// Zod validator module declaration
declare module '@hono/zod-validator' {
  import type { ZodSchema } from 'zod';
  import type { MiddlewareHandler } from 'hono';
  import type { HonoEnv } from './types';
  
  export function zValidator(
    target: 'json',
    schema: ZodSchema
  ): MiddlewareHandler<HonoEnv>;
}
