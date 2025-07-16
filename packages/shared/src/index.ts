/**
 * Chronopost Shared Types and Utilities
 * OAuth/DPoP実装で共通使用される型定義とユーティリティ
 */

// API共通型定義
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// OAuth/認証関連型定義
export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer' | 'DPoP';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface DPoPProofClaims {
  jti: string;    // JWT ID
  htm: string;    // HTTP method
  htu: string;    // HTTP URI
  iat: number;    // Issued at
  nonce?: string; // Server nonce
}

// 投稿関連型定義
export type PostStatus = 
  | 'PENDING'     // 実行待ち
  | 'EXECUTING'   // 実行中
  | 'COMPLETED'   // 完了
  | 'FAILED'      // 失敗
  | 'CANCELLED'   // キャンセル
  | 'RETRYING';   // リトライ中

export interface ScheduledPostData {
  id: string;
  content: string;
  scheduledAt: Date;
  status: PostStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  errorMsg?: string;
  retryCount: number;
  blueskyUri?: string;
  blueskyRkey?: string;
}

export interface CreatePostRequest {
  content: string;
  scheduledAt: string; // ISO string
}

export interface UpdatePostRequest {
  content?: string;
  scheduledAt?: string; // ISO string
}

// ユーザー関連型定義
export interface UserProfile {
  id: string;
  did: string;        // AT Protocol DID
  handle: string;     // Bluesky handle
  displayName?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

// エラー型定義
export interface APIError {
  error: string;
  message: string;
  code: number;
  details?: Record<string, unknown>;
}

// OAuth エラー型定義
export interface OAuthError {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope';
  error_description?: string;
  error_uri?: string;
}

// DPoP エラー型定義
export interface DPoPError {
  error: 'invalid_dpop_proof' | 'invalid_dpop_key' | 'missing_dpop_proof';
  error_description?: string;
}

// バリデーション型定義
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ユーティリティ型
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 日付関連ユーティリティ
export const dateUtils = {
  /**
   * ISO文字列を安全にDateオブジェクトに変換
   */
  parseISOString(dateString: string): Date | null {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  },

  /**
   * 現在時刻よりも未来の日時かチェック
   */
  isFutureDate(date: Date): boolean {
    return date.getTime() > Date.now();
  },

  /**
   * 指定した分数後の日時を取得
   */
  addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + (minutes * 60 * 1000));
  },

  /**
   * 2つの日時の差分を分単位で取得
   */
  diffInMinutes(date1: Date, date2: Date): number {
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60));
  },
};

// バリデーション関連ユーティリティ
export const validationUtils = {
  /**
   * 投稿内容のバリデーション
   */
  validatePostContent(content: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!content || content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Content is required',
        code: 'REQUIRED',
      });
    }

    if (content.length > 300) {
      errors.push({
        field: 'content',
        message: 'Content must be 300 characters or less',
        code: 'MAX_LENGTH',
      });
    }

    return errors;
  },

  /**
   * 予約日時のバリデーション
   */
  validateScheduledAt(scheduledAt: string): ValidationError[] {
    const errors: ValidationError[] = [];

    const date = dateUtils.parseISOString(scheduledAt);
    if (!date) {
      errors.push({
        field: 'scheduledAt',
        message: 'Invalid date format',
        code: 'INVALID_FORMAT',
      });
      return errors;
    }

    if (!dateUtils.isFutureDate(date)) {
      errors.push({
        field: 'scheduledAt',
        message: 'Scheduled time must be in the future',
        code: 'PAST_DATE',
      });
    }

    // 1年以上先の投稿は制限
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    if (date.getTime() > oneYearLater.getTime()) {
      errors.push({
        field: 'scheduledAt',
        message: 'Scheduled time cannot be more than 1 year in the future',
        code: 'TOO_FAR_FUTURE',
      });
    }

    return errors;
  },

  /**
   * Bluesky ハンドルのバリデーション
   */
  validateBlueskyHandle(handle: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!handle || handle.trim().length === 0) {
      errors.push({
        field: 'handle',
        message: 'Handle is required',
        code: 'REQUIRED',
      });
      return errors;
    }

    // Bluesky ハンドル形式のバリデーション
    const handleRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!handleRegex.test(handle)) {
      errors.push({
        field: 'handle',
        message: 'Invalid handle format',
        code: 'INVALID_FORMAT',
      });
    }

    return errors;
  },
};

// セキュリティ関連ユーティリティ
export const securityUtils = {
  /**
   * 機密情報をマスクして安全にログ出力用文字列を生成
   */
  maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...data };
    const sensitiveKeys = [
      'password',
      'token',
      'access_token',
      'refresh_token',
      'client_secret',
      'private_key',
      'dpop_private_key',
    ];

    for (const key of sensitiveKeys) {
      if (key in masked) {
        masked[key] = '***';
      }
    }

    return masked;
  },

  /**
   * トークン文字列の先頭部分のみを安全に表示
   */
  maskToken(token: string): string {
    if (!token || token.length < 8) {
      return '***';
    }
    return `${token.substring(0, 8)}...`;
  },

  /**
   * IPアドレスの一部をマスク
   */
  maskIpAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4の場合、最後のオクテットをマスク
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    // IPv6の場合は後半をマスク
    if (ip.includes(':')) {
      const colonIndex = ip.lastIndexOf(':');
      return `${ip.substring(0, colonIndex)}:***`;
    }
    return '***';
  },
};

// Phase 2以降で使用される型定義（将来実装）
export interface ThreadPostData {
  parentPostId?: string;
  threadRootId?: string;
  threadIndex: number;
  isThreadRoot: boolean;
  dependsOnPostId?: string;
}

// Phase 3以降で使用される型定義（将来実装）
export interface MediaFileData {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  altText?: string;
  isProcessed: boolean;
}

export default {
  dateUtils,
  validationUtils,
  securityUtils,
};
