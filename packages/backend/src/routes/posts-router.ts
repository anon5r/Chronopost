import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PostService } from '../services/bluesky/post-service';
import { CreatePostSchema, UpdatePostSchema } from 'shared';
import type { User } from '../services/oauth/session-manager';

// Create a router instance
const router = new Hono();

/**
 * Set up routes with post service
 * @param postService PostService instance
 * @returns Router instance
 */
export function setupPostsRouter(postService: PostService) {
  /**
   * Create a new scheduled post
   * POST /posts
   */
  router.post('/', zValidator('json', CreatePostSchema), async c => {
    try {
      // Get user from context (set by auth middleware)
      const user = c.get('user') as User | undefined;
      if (!user) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            code: 401,
          },
          401
        );
      }

      // Get validated request body
      const { content, scheduledAt } = await c.req.valid('json');

      // Create the post
      const post = await postService.createScheduledPost(user.id, content, scheduledAt);

      return c.json({ post });
    } catch (error) {
      console.error('Create post error:', error);
      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to create post',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * Get all posts for the authenticated user
   * GET /posts
   */
  router.get('/', async c => {
    try {
      // Get user from context (set by auth middleware)
      const user = c.get('user') as User | undefined;
      if (!user) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            code: 401,
          },
          401
        );
      }

      // Get query parameters
      const status = c.req.query('status');
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '10');

      // Get posts for the user
      const result = await postService.getScheduledPostsForUser(
        user.id,
        status as any,
        page,
        limit
      );

      return c.json(result);
    } catch (error) {
      console.error('Get posts error:', error);
      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to get posts',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * Get a specific post
   * GET /posts/:id
   */
  router.get('/:id', async c => {
    try {
      // Get user from context (set by auth middleware)
      const user = c.get('user') as User | undefined;
      if (!user) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            code: 401,
          },
          401
        );
      }

      // Get post ID from params
      const postId = c.req.param('id');

      // Get the post
      const post = await postService.getScheduledPost(postId, user.id);

      return c.json({ post });
    } catch (error) {
      console.error('Get post error:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return c.json(
          {
            error: 'NOT_FOUND',
            message: 'Post not found',
            code: 404,
          },
          404
        );
      }

      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to get post',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * Update a post
   * PUT /posts/:id
   */
  router.put('/:id', zValidator('json', UpdatePostSchema), async c => {
    try {
      // Get user from context (set by auth middleware)
      const user = c.get('user') as User | undefined;
      if (!user) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            code: 401,
          },
          401
        );
      }

      // Get post ID from params
      const postId = c.req.param('id');

      // Get validated request body
      const rawUpdateData = await c.req.valid('json');

      // Create a clean update object without undefined values
      const updateData = {
        ...(rawUpdateData.content !== undefined && { content: rawUpdateData.content }),
        ...(rawUpdateData.scheduledAt !== undefined && { scheduledAt: rawUpdateData.scheduledAt })
      };

      // Update the post
      const post = await postService.updateScheduledPost(postId, user.id, updateData);

      return c.json({ post });
    } catch (error) {
      console.error('Update post error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Post not found',
              code: 404,
            },
            404
          );
        } else if (error.message.includes('Cannot update post with status')) {
          return c.json(
            {
              error: 'INVALID_OPERATION',
              message: error.message,
              code: 400,
            },
            400
          );
        }
      }

      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to update post',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  /**
   * Delete a post
   * DELETE /posts/:id
   */
  router.delete('/:id', async c => {
    try {
      // Get user from context (set by auth middleware)
      const user = c.get('user') as User | undefined;
      if (!user) {
        return c.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
            code: 401,
          },
          401
        );
      }

      // Get post ID from params
      const postId = c.req.param('id');

      // Delete the post
      await postService.deleteScheduledPost(postId, user.id);

      return c.json({ success: true });
    } catch (error) {
      console.error('Delete post error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return c.json(
            {
              error: 'NOT_FOUND',
              message: 'Post not found',
              code: 404,
            },
            404
          );
        } else if (error.message.includes('Cannot delete post with status')) {
          return c.json(
            {
              error: 'INVALID_OPERATION',
              message: error.message,
              code: 400,
            },
            400
          );
        }
      }

      return c.json(
        {
          error: 'SERVER_ERROR',
          message: 'Failed to delete post',
          code: 500,
          details: error instanceof Error ? error.message : undefined,
        },
        500
      );
    }
  });

  return router;
}
