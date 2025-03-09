import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verify } from 'hono/jwt';
import { db } from '@chronopost/database';
import { validateScheduledPost } from '@chronopost/shared';
import type { HonoEnv } from '../types';
import type { DbOperations } from '../database';

export async function authMiddleware(c: Context<HonoEnv>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload || typeof payload !== 'object' || !('userId' in payload)) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    c.set('userId', payload.userId as string);
    await next();
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
}

// 2週間後以内かつ5件以内の投稿かをチェックするミドルウェア
export async function validateScheduledPostMiddleware(
  c: Context<HonoEnv>,
  next: () => Promise<void>
) {
  const body = await c.req.json();
  const scheduledAt = new Date(body.scheduledAt);

  if (!validateScheduledPost.isWithinTwoWeeks(scheduledAt)) {
    throw new HTTPException(400, { message: 'Cannot schedule posts more than 2 weeks in advance' });
  }

  const userId = c.get('userId');
  const postCount = await (db as DbOperations).getScheduledPostCount(userId);
  if (!validateScheduledPost.isWithinPostLimit(postCount)) {
    throw new HTTPException(400, { message: 'Maximum number of scheduled posts (5) reached' });
  }

  await next();
}

// ユーザーが投稿のオーナーかチェックするミドルウェア
export async function validatePostOwnershipMiddleware(
  c: Context<HonoEnv>,
  next: () => Promise<void>
) {
  const postId = c.req.param('id');
  const userId = c.get('userId');

  const post = await (db as DbOperations).scheduledPost.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  if (!post) {
    throw new HTTPException(404, { message: 'Post not found' });
  }

  if (post.userId !== userId) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  await next();
}
