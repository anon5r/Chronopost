/**
 * DPoP (Demonstrating Proof of Possession) Manager
 * 
 * AT Protocol OAuth実装における DPoP 要件の完全実装
 * RFC 9449 準拠の実装で、セキュリティベストプラクティスに従う
 */

import { importJWK, exportJWK, generateKeyPair, SignJWT, jwtVerify } from 'jose';
import type { KeyLike, JWK } from 'jose';

/**
 * DPoP Proof JWT の構造
 */
interface DPoPProof {
  jti: string;    // JWT ID（nonce）
  htm: string;    // HTTPメソッド
  htu: string;    // HTTPターゲットURI
  iat: number;    // 発行時刻
  nonce?: string; // サーバー提供のnonce（必要に応じて）
}

/**
 * DPoP キーペア管理クラス
 */
export class DPoPManager {
  private privateKey: KeyLike | null = null;
  private publicKey: KeyLike | null = null;
  private keyId: string | null = null;
  private publicJWK: JWK | null = null;

  /**
   * 新しいDPoPキーペアを生成
   * ES256アルゴリズム必須（AT Protocol要件）
   */
  async generateKeyPair(): Promise<void> {
    try {
      // ES256 (ECDSA with P-256 curve) でキーペア生成
      const keyPair = await generateKeyPair('ES256', {
        extractable: false, // セキュリティ強化
      });

      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;
      
      // 公開鍵をJWK形式でエクスポート
      this.publicJWK = await exportJWK(this.publicKey);
      
      // Key ID生成（公開鍵のthumbprint）
      this.keyId = await this.generateKeyId(this.publicJWK);
      
    } catch (error) {
      throw new Error(`Failed to generate DPoP key pair: ${error}`);
    }
  }

  /**
   * 既存の秘密鍵からキーペアを復元
   */
  async importPrivateKey(jwkPrivateKey: JWK): Promise<void> {
    try {
      // JWK形式の秘密鍵をインポート
      this.privateKey = await importJWK(jwkPrivateKey, 'ES256');
      
      // 公開鍵を秘密鍵から抽出
      const publicJWK: JWK = {
        kty: jwkPrivateKey.kty,
        crv: jwkPrivateKey.crv,
        x: jwkPrivateKey.x,
        y: jwkPrivateKey.y,
        use: 'sig',
        alg: 'ES256',
      };
      
      this.publicKey = await importJWK(publicJWK, 'ES256');
      this.publicJWK = publicJWK;
      this.keyId = await this.generateKeyId(publicJWK);
      
    } catch (error) {
      throw new Error(`Failed to import DPoP private key: ${error}`);
    }
  }

  /**
   * DPoP Proof JWT を生成
   */
  async createProof(
    method: string,
    url: string,
    nonce?: string
  ): Promise<string> {
    if (!this.privateKey || !this.publicJWK || !this.keyId) {
      throw new Error('DPoP key pair not initialized');
    }

    try {
      // DPoP Proof ペイロード
      const payload: DPoPProof = {
        jti: crypto.randomUUID(), // ランダムなJWT ID
        htm: method.toUpperCase(),
        htu: url,
        iat: Math.floor(Date.now() / 1000),
      };

      // サーバーnonceが提供されている場合は追加
      if (nonce) {
        payload.nonce = nonce;
      }

      // JWT 作成
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({
          alg: 'ES256',
          typ: 'dpop+jwt',
          jwk: this.publicJWK,
        })
        .sign(this.privateKey);

      return jwt;
    } catch (error) {
      throw new Error(`Failed to create DPoP proof: ${error}`);
    }
  }

  /**
   * 公開鍵のJWK形式を取得
   */
  getPublicJWK(): JWK {
    if (!this.publicJWK) {
      throw new Error('Public key not available');
    }
    return this.publicJWK;
  }

  /**
   * 秘密鍵をJWK形式でエクスポート（暗号化保存用）
   */
  async exportPrivateKey(): Promise<JWK> {
    if (!this.privateKey) {
      throw new Error('Private key not available');
    }

    try {
      return await exportJWK(this.privateKey);
    } catch (error) {
      throw new Error(`Failed to export private key: ${error}`);
    }
  }

  /**
   * Key IDを取得
   */
  getKeyId(): string {
    if (!this.keyId) {
      throw new Error('Key ID not available');
    }
    return this.keyId;
  }

  /**
   * DPoP Proof の検証（サーバーサイド用）
   */
  static async verifyProof(
    proofJWT: string,
    expectedMethod: string,
    expectedUrl: string,
    expectedNonce?: string
  ): Promise<{
    valid: boolean;
    payload?: DPoPProof;
    publicKey?: JWK;
    error?: string;
  }> {
    try {
      // JWT ヘッダーのパース
      const [headerB64] = proofJWT.split('.');
      const header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString()
      );

      // ヘッダー検証
      if (header.typ !== 'dpop+jwt' || header.alg !== 'ES256') {
        return { valid: false, error: 'Invalid JWT header' };
      }

      if (!header.jwk) {
        return { valid: false, error: 'Missing public key in header' };
      }

      // 公開鍵でJWT検証
      const publicKey = await importJWK(header.jwk, 'ES256');
      const { payload } = await jwtVerify(proofJWT, publicKey);
      const dPopPayload = payload as unknown as DPoPProof;

      // ペイロード検証
      if (dPopPayload.htm !== expectedMethod.toUpperCase()) {
        return { 
          valid: false, 
          error: `Method mismatch: expected ${expectedMethod}, got ${dPopPayload.htm}` 
        };
      }

      if (dPopPayload.htu !== expectedUrl) {
        return { 
          valid: false, 
          error: `URL mismatch: expected ${expectedUrl}, got ${dPopPayload.htu}` 
        };
      }

      // nonce検証（提供されている場合）
      if (expectedNonce && dPopPayload.nonce !== expectedNonce) {
        return { 
          valid: false, 
          error: 'Nonce mismatch' 
        };
      }

      // 時刻検証（±60秒の許容範囲）
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - dPopPayload.iat) > 60) {
        return { 
          valid: false, 
          error: 'Token timestamp out of acceptable range' 
        };
      }

      return {
        valid: true,
        payload: dPopPayload,
        publicKey: header.jwk,
      };

    } catch (error) {
      return { 
        valid: false, 
        error: `Verification failed: ${error}` 
      };
    }
  }

  /**
   * 公開鍵のthumbprintを生成してKey IDとして使用
   */
  private async generateKeyId(jwk: JWK): Promise<string> {
    try {
      // RFC 7638に従ったJWK thumbprint生成
      const canonical = JSON.stringify({
        crv: jwk.crv,
        kty: jwk.kty,
        x: jwk.x,
        y: jwk.y,
      });

      const encoder = new TextEncoder();
      const data = encoder.encode(canonical);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Base64URL エンコード
      return Buffer.from(hashBuffer)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      throw new Error(`Failed to generate key ID: ${error}`);
    }
  }

  /**
   * キーペアの状態確認
   */
  isInitialized(): boolean {
    return !!(this.privateKey && this.publicKey && this.publicJWK && this.keyId);
  }

  /**
   * メモリからキー情報をクリア（セキュリティ対策）
   */
  clear(): void {
    this.privateKey = null;
    this.publicKey = null;
    this.publicJWK = null;
    this.keyId = null;
  }
}

/**
 * DPoP セッション管理
 * OAuth セッションと DPoP キーペアを関連付けて管理
 */
export class DPoPSessionManager {
  private sessions: Map<string, DPoPManager> = new Map();

  /**
   * 新しいDPoPセッションを作成
   */
  async createSession(sessionId: string): Promise<DPoPManager> {
    const dPopManager = new DPoPManager();
    await dPopManager.generateKeyPair();
    
    this.sessions.set(sessionId, dPopManager);
    return dPopManager;
  }

  /**
   * 既存のセッションを復元
   */
  async restoreSession(sessionId: string, privateKeyJWK: JWK): Promise<DPoPManager> {
    const dPopManager = new DPoPManager();
    await dPopManager.importPrivateKey(privateKeyJWK);
    
    this.sessions.set(sessionId, dPopManager);
    return dPopManager;
  }

  /**
   * セッションのDPoPマネージャーを取得
   */
  getSession(sessionId: string): DPoPManager | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * セッションを削除
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clear(); // メモリクリア
      this.sessions.delete(sessionId);
    }
  }

  /**
   * 全セッションをクリア
   */
  clearAllSessions(): void {
    for (const [sessionId, session] of this.sessions) {
      session.clear();
    }
    this.sessions.clear();
  }

  /**
   * アクティブセッション数を取得
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

/**
 * DPoP ユーティリティ関数
 */
export const dpopUtils = {
  /**
   * HTTPリクエストからDPoPヘッダーを抽出
   */
  extractDPoPHeader(headers: Record<string, string | undefined>): string | null {
    return headers['dpop'] || headers['DPoP'] || null;
  },

  /**
   * DPoP nonceをレスポンスヘッダーに設定
   */
  setDPoPNonce(headers: Record<string, string>, nonce: string): void {
    headers['DPoP-Nonce'] = nonce;
  },

  /**
   * DPoP関連エラーレスポンスを生成
   */
  createDPoPError(
    error: 'invalid_dpop_proof' | 'invalid_dpop_key' | 'missing_dpop_proof',
    description?: string
  ) {
    const errorMessages = {
      invalid_dpop_proof: 'The DPoP proof is invalid',
      invalid_dpop_key: 'The DPoP key is invalid or has changed',
      missing_dpop_proof: 'DPoP proof is required but missing',
    };

    return {
      error,
      error_description: description || errorMessages[error],
    };
  },

  /**
   * URLの正規化（DPoP HTUクレーム用）
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // クエリパラメータとフラグメントを除外
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url; // 無効なURLの場合はそのまま返す
    }
  },

  /**
   * DPoP Proof の再利用検出用のハッシュ生成
   */
  async generateProofHash(proofJWT: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(proofJWT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    return Buffer.from(hashBuffer).toString('hex');
  },
};

/**
 * AT Protocol 固有のDPoP設定
 */
export const atProtocolDPoP = {
  /**
   * AT Protocol OAuth エンドポイント用のDPoP設定
   */
  REQUIRED_ALGORITHMS: ['ES256'] as const,
  TOKEN_ENDPOINT_PATH: '/oauth/token',
  AUTHORIZATION_ENDPOINT_PATH: '/oauth/authorize',
  
  /**
   * AT Protocol用のDPoP Proofを作成
   */
  async createATProofForTokenRequest(
    dPopManager: DPoPManager,
    tokenEndpoint: string,
    nonce?: string
  ): Promise<string> {
    return dPopManager.createProof('POST', tokenEndpoint, nonce);
  },

  /**
   * AT Protocol API呼び出し用のDPoP Proofを作成
   */
  async createATProofForAPICall(
    dPopManager: DPoPManager,
    method: string,
    apiEndpoint: string,
    nonce?: string
  ): Promise<string> {
    const normalizedUrl = dpopUtils.normalizeUrl(apiEndpoint);
    return dPopManager.createProof(method, normalizedUrl, nonce);
  },

  /**
   * Bluesky PDS用のDPoP設定検証
   */
  validateATProtocolCompliance(publicJWK: JWK): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 必須フィールドの確認
    if (publicJWK.kty !== 'EC') {
      errors.push('Key type must be EC (Elliptic Curve)');
    }

    if (publicJWK.crv !== 'P-256') {
      errors.push('Curve must be P-256');
    }

    if (!publicJWK.x || !publicJWK.y) {
      errors.push('Missing required coordinate fields (x, y)');
    }

    // 推奨フィールドの確認
    if (publicJWK.use && publicJWK.use !== 'sig') {
      errors.push('Key use should be "sig" for signature operations');
    }

    if (publicJWK.alg && publicJWK.alg !== 'ES256') {
      errors.push('Algorithm should be ES256');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// グローバルDPoPセッションマネージャー（シングルトン）
export const globalDPoPSessionManager = new DPoPSessionManager();

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  globalDPoPSessionManager.clearAllSessions();
});

process.on('SIGINT', () => {
  globalDPoPSessionManager.clearAllSessions();
});

export default DPoPManager;
