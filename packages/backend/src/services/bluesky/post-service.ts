import { BlueskyApiClient } from './api-client';
import { prisma } from '../../lib/prisma';
import type { ScheduledPost, PostStatus } from 'shared';

/**
 * PostService class - Handles post creation and management
 */
export class PostService {
  private apiClient: BlueskyApiClient;

  /**
   * Create a new PostService instance
   * @param apiClient BlueskyApiClient instance
   */
  constructor(apiClient: BlueskyApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Create a new scheduled post
   * @param userId User ID
   * @param content Post content
   * @param scheduledAt When to post
   * @returns Created post
   */
  async createScheduledPost(
    userId: string,
    content: string,
    scheduledAt: Date
  ): Promise<ScheduledPost> {
    // Validate scheduledAt is in the future
    const now = new Date();
    if (scheduledAt <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    // Create the post
    const post = await prisma.scheduledPost.create({
      data: {
        userId,
        content,
        scheduledAt,
        status: 'PENDING',
        retryCount: 0,
      },
    });

    // Convert Prisma type to ScheduledPost type
    return post as unknown as ScheduledPost;
  }

  /**
   * Get a scheduled post by ID
   * @param postId Post ID
   * @param userId User ID (for authorization)
   * @returns Post if found
   */
  async getScheduledPost(postId: string, userId?: string): Promise<ScheduledPost> {
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // If userId is provided, check authorization
    if (userId && post.userId !== userId) {
      throw new Error('Unauthorized access to post');
    }

    return post as unknown as ScheduledPost;
  }

  /**
   * Update a scheduled post
   * @param postId Post ID
   * @param userId User ID (for authorization)
   * @param data Update data
   * @returns Updated post
   */
  async updateScheduledPost(
    postId: string,
    userId: string,
    data: {
      content?: string;
      scheduledAt?: Date;
    }
  ): Promise<ScheduledPost> {
    // Get the post to check authorization and status
    const post = await this.getScheduledPost(postId, userId);

    // Only allow updates for pending posts
    if (post.status !== 'PENDING') {
      throw new Error(`Cannot update post with status ${post.status}`);
    }

    // Validate scheduledAt is in the future if provided
    if (data.scheduledAt && data.scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Update the post
    const updatedPost = await prisma.scheduledPost.update({
      where: { id: postId },
      data,
    });

    return updatedPost as unknown as ScheduledPost;
  }

  /**
   * Delete a scheduled post
   * @param postId Post ID
   * @param userId User ID (for authorization)
   * @returns Deleted post
   */
  async deleteScheduledPost(postId: string, userId: string): Promise<ScheduledPost> {
    // Get the post to check authorization and status
    const post = await this.getScheduledPost(postId, userId);

    // Only allow deletion for pending posts
    if (post.status !== 'PENDING') {
      throw new Error(`Cannot delete post with status ${post.status}`);
    }

    // Delete the post
    const deletedPost = await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: 'CANCELLED',
      },
    });

    return deletedPost as unknown as ScheduledPost;
  }

  /**
   * Get scheduled posts for a user
   * @param userId User ID
   * @param status Filter by status
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated posts
   */
  async getScheduledPostsForUser(
    userId: string,
    status?: PostStatus,
    page = 1,
    limit = 10
  ): Promise<{
    posts: ScheduledPost[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.scheduledPost.count({ where }),
    ]);

    return {
      posts: posts as unknown as ScheduledPost[],
      total,
      page,
      limit,
    };
  }

  /**
   * Execute a scheduled post
   * @param postId Post ID
   * @returns Executed post with Bluesky reference
   */
  async executePost(postId: string): Promise<ScheduledPost> {
    // Get the post
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status !== 'PENDING' && post.status !== 'FAILED') {
      throw new Error(`Cannot execute post with status ${post.status}`);
    }

    // Update to processing status
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Create the post on Bluesky
      const result = await this.apiClient.createPost(post.userId, post as unknown as ScheduledPost);

      // Update with success status
      const updatedPost = await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: 'COMPLETED',
          executedAt: new Date(),
          blueskyUri: result.uri,
          blueskyRkey: result.uri.split('/').pop() || '',
        },
      });

      return updatedPost as unknown as ScheduledPost;
    } catch (error) {
      console.error(`Failed to execute post ${postId}:`, error);

      // Handle retries
      const retryCount = (post.retryCount || 0) + 1;
      const maxRetries = 3;

      // Update with failure status
      const failedPost = await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: retryCount >= maxRetries ? 'FAILED' : 'PENDING',
          retryCount,
          errorMsg: error instanceof Error ? error.message : String(error),
        },
      });

      return failedPost as unknown as ScheduledPost;
    }
  }

  /**
   * Get pending posts that should be executed
   * @returns Array of posts to execute
   */
  async getPendingPostsDueForExecution(): Promise<ScheduledPost[]> {
    const now = new Date();

    const posts = await prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100, // Process in batches
    });

    return posts as unknown as ScheduledPost[];
  }
}
