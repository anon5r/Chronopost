import * as cron from 'node-cron';

/**
 * Type for cron job handlers
 */
type JobHandler = () => void | Promise<void>;

/**
 * CronManager class - Manages cron jobs for the application
 */
export class CronManager {
  private jobs: Map<string, cron.ScheduledTask>;

  /**
   * Create a new CronManager instance
   */
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Register a new cron job
   * @param name Job name (must be unique)
   * @param schedule Cron schedule expression
   * @param handler Function to run on schedule
   * @returns Success status
   */
  registerJob(name: string, schedule: string, handler: JobHandler): boolean {
    // Validate schedule
    if (!cron.validate(schedule)) {
      console.error(`Invalid cron schedule: ${schedule}`);
      return false;
    }

    // Check if job already exists
    if (this.jobs.has(name)) {
      console.error(`Job already exists: ${name}`);
      return false;
    }

    // Create the job
    try {
      const task = cron.schedule(schedule, async () => {
        try {
          const result = handler();
          // Handle promise if returned
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          console.error(`Error in cron job ${name}:`, error);
        }
      });

      // Store the job
      this.jobs.set(name, task);
      console.log(`Registered cron job: ${name} (${schedule})`);
      return true;
    } catch (error) {
      console.error(`Failed to register cron job ${name}:`, error);
      return false;
    }
  }

  /**
   * Start a registered job
   * @param name Job name
   * @returns Success status
   */
  startJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job not found: ${name}`);
      return false;
    }

    job.start();
    console.log(`Started cron job: ${name}`);
    return true;
  }

  /**
   * Stop a registered job
   * @param name Job name
   * @returns Success status
   */
  stopJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job not found: ${name}`);
      return false;
    }

    job.stop();
    console.log(`Stopped cron job: ${name}`);
    return true;
  }

  /**
   * Check if a job is running
   * @param name Job name
   * @returns Whether the job is running
   */
  isJobRunning(name: string): boolean {
    const job = this.jobs.get(name);
    return !!job && job.getStatus() === 'scheduled';
  }

  /**
   * Delete a registered job
   * @param name Job name
   * @returns Success status
   */
  deleteJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job not found: ${name}`);
      return false;
    }

    job.stop();
    this.jobs.delete(name);
    console.log(`Deleted cron job: ${name}`);
    return true;
  }

  /**
   * Get all registered job names
   * @returns Array of job names
   */
  getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Get job details
   * @param name Job name
   * @returns Job details or null if not found
   */
  getJobDetails(name: string): { name: string; status: string } | null {
    const job = this.jobs.get(name);
    if (!job) {
      return null;
    }

    return {
      name,
      status: job.getStatus(),
    };
  }

  /**
   * Start all registered jobs
   */
  startAllJobs(): void {
    for (const name of this.getJobNames()) {
      this.startJob(name);
    }
  }

  /**
   * Stop all registered jobs
   */
  stopAllJobs(): void {
    for (const name of this.getJobNames()) {
      this.stopJob(name);
    }
  }
}
