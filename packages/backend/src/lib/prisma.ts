import { PrismaClient } from '@prisma/client';

// PrismaClient instance with extended logging for development
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Add middleware for logging
  client.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`${params.model}.${params.action} took ${after - before}ms`);
    }

    return result;
  });

  return client;
};

// Create a singleton
export const prisma = createPrismaClient();

/**
 * Execute a transaction with proper error handling
 * @param fn Function to execute within the transaction
 * @returns Result of the transaction
 */
export async function transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    try {
      return await fn(tx as PrismaClient);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  });
}
