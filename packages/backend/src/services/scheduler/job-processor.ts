import { CronManager } from './cron-manager';
import { PostScheduler } from './post-scheduler';

/**
 * JobProcessor class - Sets up and manages all scheduled jobs
 */
export class JobProcessor {
  private cronManager: CronManager;
  private postScheduler: PostScheduler;

  /**
   * Create a new JobProcessor instance
   * @param cronManager CronManager instance
   * @param postScheduler PostScheduler instance
   */
  constructor(cronManager: CronManager, postScheduler: PostScheduler) {
    this.cronManager = cronManager;
    this.postScheduler = postScheduler;
  }

  /**
   * Initialize all jobs
   */
  initialize(): void {
    console.log('Initializing job processor...');

    // Register post processing job (runs every minute)
    this.cronManager.registerJob('process-pending-posts', '* * * * *', () =>
      this.postScheduler.processPendingPosts()
    );

    // Register maintenance jobs
    this.cronManager.registerJob(
      'cleanup-old-posts',
      '0 3 * * *', // Every day at 3:00 AM
      () => this.cleanupOldPosts()
    );

    // Register health check job
    this.cronManager.registerJob(
      'scheduler-health-check',
      '*/30 * * * *', // Every 30 minutes
      () => this.performHealthCheck()
    );
  }

  /**
   * Start all jobs
   */
  startJobs(): void {
    console.log('Starting all jobs...');
    this.cronManager.startAllJobs();
  }

  /**
   * Stop all jobs
   */
  stopJobs(): void {
    console.log('Stopping all jobs...');
    this.cronManager.stopAllJobs();
  }

  /**
   * Clean up old completed posts
   * Keeps the database clean by archiving old posts
   */
  private async cleanupOldPosts(): Promise<void> {
    // This is a placeholder for actual implementation
    console.log('Cleaning up old posts...');
    // TODO: Implement archiving or deletion of old posts
  }

  /**
   * Perform health check on the scheduler
   * Ensures the scheduler is running correctly
   */
  private async performHealthCheck(): Promise<void> {
    console.log('Performing scheduler health check...');

    try {
      // Check if any jobs are running
      const jobNames = this.cronManager.getJobNames();
      const runningJobs = jobNames.filter(name => this.cronManager.isJobRunning(name));

      console.log(`Health check: ${runningJobs.length}/${jobNames.length} jobs running`);

      // Force processing if scheduler appears stuck
      const processJobRunning = this.cronManager.isJobRunning('process-pending-posts');
      if (!processJobRunning) {
        console.warn('Post processor job not running, restarting...');
        this.cronManager.startJob('process-pending-posts');
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }
}
