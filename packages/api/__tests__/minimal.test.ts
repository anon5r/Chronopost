import { describe, it, expect } from 'vitest';

describe('Minimal Test', () => {
  it('should pass', () => {
    console.log('Starting minimal test');
    expect(true).toBe(true);
  });

  it('should handle async', async () => {
    console.log('Starting async test');
    const result = await Promise.resolve(42);
    console.log('Async result:', result);
    expect(result).toBe(42);
  });

  it('should handle JSON', () => {
    console.log('Starting JSON test');
    const data = { success: true, message: 'test' };
    console.log('Test data:', JSON.stringify(data));
    expect(data.success).toBe(true);
  });
});
