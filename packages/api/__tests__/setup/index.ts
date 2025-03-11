import { vi } from 'vitest';
import type { Mock } from 'vitest';
import './matchers';

// Database Mock Setup
export const mockDb = {
  userSession: {
    upsert: vi.fn().mockResolvedValue({
      userId: 'test-user-id',
      identifier: 'test@example.com'
    })
  }
};

// BskyAgent Mock Setup
export const mockBskyAgent = {
  service: 'https://bsky.social',
  login: vi.fn().mockResolvedValue({
    data: {
      did: 'did:plc:test',
      handle: 'test.bsky.social',
      accessJwt: 'test-access-jwt',
      refreshJwt: 'test-refresh-jwt'
    }
  })
};

export const MockBskyAgentClass = vi.fn().mockImplementation(() => mockBskyAgent);

// JWT Mock Setup
export const mockJwt = {
  sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  verify: vi.fn().mockResolvedValue({ userId: 'test-user-id' })
};

// Setup all mocks
export const setupMocks = () => {
  // Database mock
  vi.mock('@chronopost/database', () => ({
    db: mockDb
  }));

  // BskyAgent mock
  vi.mock('@atproto/api', () => ({
    BskyAgent: MockBskyAgentClass
  }));

  // JWT mock
  vi.mock('hono/jwt', () => mockJwt);
};

// Test environment
export const testEnv = {
  Bindings: {
    BLUESKY_SERVICE: 'https://bsky.social',
    JWT_SECRET: 'test-secret',
    DB: {} as D1Database
  },
  Variables: {
    userId: ''
  }
};

// Mock reset utility
export const resetMocks = () => {
  vi.clearAllMocks();
  Object.values(mockDb).forEach(mock => {
    if (mock && typeof mock === 'object') {
      Object.values(mock).forEach(fn => {
        if (vi.isMockFunction(fn)) {
          (fn as Mock).mockReset();
        }
      });
    }
  });
  Object.values(mockBskyAgent).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      (fn as Mock).mockReset();
    }
  });
  Object.values(mockJwt).forEach(fn => {
    if (vi.isMockFunction(fn)) {
      (fn as Mock).mockReset();
    }
  });
};
