/// <reference types="vitest" />

interface CustomMatchers<R = unknown> {
  toBeSuccessResponse(): R;
  toBeErrorResponse(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
  interface InverseAssertion extends CustomMatchers {}
}

// APIレスポンス型
export interface SuccessResponse {
  success: true;
  data: any;
}

export interface ErrorResponse {
  success: false;
  error: string;
}
