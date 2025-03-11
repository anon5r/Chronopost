import { expect } from 'vitest';
import type { SuccessResponse, ErrorResponse } from '../../src/types/vitest';

expect.extend({
  toBeSuccessResponse(received: unknown): { pass: boolean; message: () => string } {
    const pass = (
      received != null &&
      typeof received === 'object' &&
      'success' in received &&
      received.success === true &&
      'data' in received
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a success response, but received: ${JSON.stringify(received, null, 2)}`
          : `Expected to be a success response, but received: ${JSON.stringify(received, null, 2)}`
    };
  },

  toBeErrorResponse(received: unknown): { pass: boolean; message: () => string } {
    const pass = (
      received != null &&
      typeof received === 'object' &&
      'success' in received &&
      received.success === false &&
      'error' in received &&
      typeof received.error === 'string'
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be an error response, but received: ${JSON.stringify(received, null, 2)}`
          : `Expected to be an error response, but received: ${JSON.stringify(received, null, 2)}`
    };
  }
});

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeSuccessResponse(): void;
    toBeErrorResponse(): void;
  }
}
