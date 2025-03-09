import { Hono } from 'hono/tiny';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '@chronopost/database';
import { PostContentSchema } from '@chronopost/shared';
import { authMiddleware, validatePostOwnershipMiddleware, validateScheduledPostMiddleware } from '../middleware/auth';
import type { HonoEnv, ApiResponse, ScheduledPost, CreatePostRequest, UpdatePostRequest } from '../types';
import type { DbOperations } from '../database';

// ルーターの作成
const posts = new Hono<HonoEnv>();

// リクエストのバリデーションスキーマ
const createPostSchema = z.object({
  content: PostContentSchema,
  scheduledAt: z.string().datetime(),
}) satisfies z.ZodType<CreatePostRequest>;

const updatePostSchema = z.object({
  content: PostContentSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
}) satisfies z.ZodType<UpdatePostRequest>;

// 予約投稿の作成
posts.post('/', authMiddleware, validateScheduledPostMiddleware, zValidator('json', createPostSchema), async (c) => {
  try {
    const userId = c.get('userId');
    const { content, scheduledAt } = c.req.valid('json');

    const post = await (db as DbOperations).scheduledPost.create({
      data: {
        userId,
        content,
        scheduledAt: new Date(scheduledAt),
        status: 'PENDING',
      },
    });

    return c.json<ApiResponse<ScheduledPost>>({
      success: true,
      data: post,
    });
  } catch (error) {
    return c.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post',
    }, 500);
  }
});

// 予約投稿の一覧取得
posts.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const posts = await (db as DbOperations).scheduledPost.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'asc' },
    });

    return c.json<ApiResponse<ScheduledPost[]>>({
      success: true,
      data: posts,
    });
  } catch (error) {
    return c.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts',
    }, 500);
  }
});

// 予約投稿の詳細取得
posts.get('/:id', authMiddleware, validatePostOwnershipMiddleware, async (c) => {
  try {
    const postId = c.req.param('id');

    const post = await (db as DbOperations).scheduledPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return c.json<ApiResponse<never>>({
        success: false,
        error: 'Post not found',
      }, 404);
    }

    return c.json<ApiResponse<ScheduledPost>>({
      success: true,
      data: post,
    });
  } catch (error) {
    return c.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch post',
    }, 500);
  }
});

// 予約投稿の更新
posts.patch('/:id', authMiddleware, validatePostOwnershipMiddleware, zValidator('json', updatePostSchema), async (c) => {
  try {
    const postId = c.req.param('id');
    const updates = c.req.valid('json');

    const updateData: Partial<ScheduledPost> = {};
    if (updates.content) updateData.content = updates.content;
    if (updates.scheduledAt) updateData.scheduledAt = new Date(updates.scheduledAt);

    const post = await (db as DbOperations).scheduledPost.update({
      where: { id: postId },
      data: updateData,
    });

    return c.json<ApiResponse<ScheduledPost>>({
      success: true,
      data: post,
    });
  } catch (error) {
    return c.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post',
    }, 500);
  }
});

// 予約投稿の削除
posts.delete('/:id', authMiddleware, validatePostOwnershipMiddleware, async (c) => {
  try {
    const postId = c.req.param('id');

    await (db as DbOperations).scheduledPost.delete({
      where: { id: postId },
    });

    return c.json<ApiResponse<void>>({
      success: true,
      data: undefined,
    });
  } catch (error) {
    return c.json<ApiResponse<never>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post',
    }, 500);
  }
});

export default posts;
