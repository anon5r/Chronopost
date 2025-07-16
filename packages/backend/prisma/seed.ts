import { PrismaClient, PostStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { did: 'did:plc:abcdefghijklmnopqrstuvwxyz' },
    update: {},
    create: {
      did: 'did:plc:abcdefghijklmnopqrstuvwxyz',
      handle: 'test.bsky.social',
      displayName: 'Test User',
      isActive: true,
    },
  });

  console.log(`Created test user with ID: ${testUser.id}`);

  // Create a test OAuth session (for development only)
  const testSession = await prisma.oAuthSession.upsert({
    where: { id: 'test-session-id' },
    update: {},
    create: {
      id: 'test-session-id',
      userId: testUser.id,
      accessToken: 'encrypted_access_token', // This would be encrypted in real usage
      refreshToken: 'encrypted_refresh_token', // This would be encrypted in real usage
      dPopPrivateKey: 'encrypted_dpop_private_key', // This would be encrypted in real usage
      dPopPublicKey: '{"key":"value"}', // Public key as JSON string
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true,
    },
  });

  console.log(`Created test OAuth session with ID: ${testSession.id}`);

  // Create some test scheduled posts
  const now = new Date();

  // Pending post in the future
  await prisma.scheduledPost.create({
    data: {
      userId: testUser.id,
      content: 'This is a test scheduled post for the future. #testing',
      scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day in the future
      status: PostStatus.PENDING,
    },
  });

  // Completed post in the past
  await prisma.scheduledPost.create({
    data: {
      userId: testUser.id,
      content: 'This is a completed test post. #success',
      scheduledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day in the past
      status: PostStatus.COMPLETED,
      executedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 1000), // Just after scheduled time
      blueskyUri: `at://did:plc:abcdefghijklmnopqrstuvwxyz/app.bsky.feed.post/${randomUUID()}`,
      blueskyRkey: randomUUID(),
    },
  });

  // Failed post in the past
  await prisma.scheduledPost.create({
    data: {
      userId: testUser.id,
      content: 'This post failed to publish due to an error. #failed',
      scheduledAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours in the past
      status: PostStatus.FAILED,
      retryCount: 3,
      errorMsg: 'API request failed: 429 {"error":"Too many requests"}',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
