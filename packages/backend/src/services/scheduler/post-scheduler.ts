import * as cron from 'node-cron';
import { PostService } from '../bluesky/post-service';
import { prisma } from '../../lib/prisma';
import type { ScheduledPost } from '../../../shared/src/types';

/**
 * PostScheduler class - Handles the execution of scheduled posts
 */
export class PostScheduler {
  private postService: PostService;
  private isRunning: boolean;
  private task: cron.ScheduledTask | null;
  private cronSchedule: string;

  /**
   * Create a new PostScheduler instance
   * @param postService PostService instance
   * @param cronSchedule Cron schedule (default: every minute)
   */
  constructor(
    postService: PostService,
    cronSchedule = '* * * * *' // Every minute by default
  ) {
    this.postService = postService;
    this.isRunning = false;
    this.task = null;
    this.cronSchedule = cronSchedule;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.task) {
      return; // Already started
    }

    console.log(`Starting post scheduler with schedule: ${this.cronSchedule}`);

    // Create a cron task to run on the schedule
    this.task = cron.schedule(this.cronSchedule, async () => {
      await this.processPendingPosts();
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.task) {
      return; // Not running
    }

    console.log('Stopping post scheduler');

    this.task.stop();
    this.task = null;
  }

  /**
   * Process pending posts
   */
  async processPendingPosts(): Promise<void> {
    // Prevent multiple concurrent runs
    if (this.isRunning) {
      console.log('Scheduler already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('Processing pending posts...');

      // Get posts that are due for execution
      const pendingPosts = await this.postService.getPendingPostsDueForExecution();

      console.log(`Found ${pendingPosts.length} pending posts to execute`);

      if (pendingPosts.length === 0) {
        return;
      }

      // Execute each post
      await this.executePostsBatch(pendingPosts);
    } catch (error) {
      console.error('Error processing pending posts:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute a batch of posts
   * @param posts Posts to execute
   */
  private async executePostsBatch(posts: ScheduledPost[]): Promise<void> {
    // Process posts in batches to avoid overwhelming the API
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      batches.push(batch);
    }

    // Process each batch sequentially
    for (const batch of batches) {
      await Promise.all(
        batch.map(async post => {
          try {
            await this.postService.executePost(post.id);
          } catch (error) {
            console.error(`Error executing post ${post.id}:`, error);
          }
        })
      );

      // Add a small delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Force process all pending posts immediately
   * Useful for testing or manual triggers
   */
  async forceProcessPendingPosts(): Promise<void> {
    return this.processPendingPosts();
  }
}
