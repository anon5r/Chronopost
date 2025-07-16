import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import services
import { OAuthClient } from './services/oauth/oauth-client';
import { BlueskyApiClient } from './services/bluesky/api-client';
import { PostService } from './services/bluesky/post-service';
import { RateLimiter } from './services/bluesky/rate-limiter';
import { CronManager } from './services/scheduler/cron-manager';
import { PostScheduler } from './services/scheduler/post-scheduler';
import { JobProcessor } from './services/scheduler/job-processor';

// Import routers
import { setupAuthRouter } from './routes/auth-router';
import { setupPostsRouter } from './routes/posts-router';

// Import middlewares
import { authMiddleware } from './middlewares/auth-middleware';
import { setupSecurity } from './middlewares/security';

// Ensure required environment variables are set
/* eslint-disable no-undef, @typescript-eslint/no-non-null-assertion */
const requiredEnvVars = ['DATABASE_URL', 'ENCRYPTION_KEY', 'FRONTEND_URL', 'CLIENT_ID'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Required environment variable ${envVar} is not set`);
    process.exit(1);
  }
}

// Initialize OAuth configuration
const oauthConfig = {
  clientId: process.env.CLIENT_ID!,
  redirectUri: `${process.env.FRONTEND_URL}/auth/callback`,
  scope: 'atproto transition:generic',
  provider: 'bluesky',
  authorizationEndpoint: 'https://bsky.app/authorize',
  tokenEndpoint: 'https://bsky.app/oauth/token',
};

// Initialize the OAuthClient
const oauthClient = new OAuthClient(oauthConfig, process.env.ENCRYPTION_KEY!);

// Initialize Bluesky API client
const blueskyApiClient = new BlueskyApiClient(
  'https://bsky.social',
  oauthClient.getDPoPManager(),
  oauthClient.getTokenManager(),
);

// Initialize rate limiter
const rateLimiter = new RateLimiter();
rateLimiter.configureLimit('bluesky_api', 300, 5 * 60 * 1000); // 300 requests per 5 minutes
rateLimiter.configureLimit('oauth_token', 60, 60 * 1000); // 60 requests per minute

// Initialize post service
const postService = new PostService(blueskyApiClient);

// Initialize scheduler components
const cronManager = new CronManager();
const postScheduler = new PostScheduler(postService);
const jobProcessor = new JobProcessor(cronManager, postScheduler);

// Create the Hono app
const app = new Hono();

// Set up security middlewares
setupSecurity(app);

// Public routes (no auth required)
app.route('/api/auth', setupAuthRouter(oauthClient));

// Protected routes (auth required)
app.use('/api/posts/*', authMiddleware);
app.route('/api/posts', setupPostsRouter(postService));

// Health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

// Start the scheduler
jobProcessor.initialize();
jobProcessor.startJobs();

// Start the server
const port = parseInt(process.env.PORT ?? '3000', 10);
serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);

// Handle graceful shutdown
/* eslint-disable no-undef, @typescript-eslint/require-await */
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  jobProcessor.stopJobs();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  jobProcessor.stopJobs();
  process.exit(0);
});
/* eslint-enable no-undef, @typescript-eslint/require-await */
