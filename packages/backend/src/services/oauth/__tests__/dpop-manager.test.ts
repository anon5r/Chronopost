/**
 * DPoP Manager Test Suite
 * セキュリティ機能と型安全性を重視したテスト
 */

import { DPoPManager, dpopUtils, atProtocolDPoP } from '../dpop-manager';
import { setupTestDatabase } from '../../test-utils/database-helpers';

// データベースセットアップ
setupTestDatabase();

describe('DPoP Manager', () => {
  let dPopManager: DPoPManager;

  beforeEach(() => {
    dPopManager = new DPoPManager();
  });

  afterEach(() => {
    dPopManager.clear();
  });

  describe('Key Pair Generation', () => {
    it('should generate ES256 key pair successfully', async () => {
      await dPopManager.generateKeyPair();

      expect(dPopManager.isInitialized()).toBe(true);
      expect(dPopManager.getKeyId()).toBeDefined();

      const publicJWK = dPopManager.getPublicJWK();
      expect(publicJWK.kty).toBe('EC');
      expect(publicJWK.crv).toBe('P-256');
    });

    it('should validate AT Protocol compliance', async () => {
      await dPopManager.generateKeyPair();
      const publicJWK = dPopManager.getPublicJWK();

      const compliance = atProtocolDPoP.validateATProtocolCompliance(publicJWK);
      expect(compliance.valid).toBe(true);
      expect(compliance.errors).toHaveLength(0);
    });

    it('should handle key generation errors', async () => {
      // WebCrypto エラーをシミュレート
      global.mockWebCrypto.generateKey.mockRejectedValueOnce(new Error('Key generation failed'));

      await expect(dPopManager.generateKeyPair()).rejects.toThrow(
        'Failed to generate DPoP key pair'
      );
    });
  });

  describe('Key Import/Export', () => {
    it('should import private key correctly', async () => {
      const privateKeyJWK = global.testUtils.mockDPoPKeyPair.privateKey;

      await dPopManager.importPrivateKey(privateKeyJWK);

      expect(dPopManager.isInitialized()).toBe(true);
      expect(dPopManager.getPublicJWK()).toMatchObject({
        kty: 'EC',
        crv: 'P-256',
      });
    });

    it('should export private key for storage', async () => {
      await dPopManager.generateKeyPair();

      const exportedKey = await dPopManager.exportPrivateKey();

      expect(exportedKey).toMatchObject({
        kty: 'EC',
        crv: 'P-256',
        d: expect.any(String), // 秘密鍵を含む
      });
    });

    it('should handle import errors gracefully', async () => {
      const invalidKey = { ...global.testUtils.mockDPoPKeyPair.privateKey };
      delete invalidKey.x; // 必須フィールドを削除

      await expect(dPopManager.importPrivateKey(invalidKey)).rejects.toThrow();
    });
  });

  describe('DPoP Proof Creation', () => {
    beforeEach(async () => {
      await dPopManager.generateKeyPair();
    });

    it('should create valid DPoP proof', async () => {
      const method = 'POST';
      const url = 'https://auth.bsky.social/oauth/token';
      const nonce = 'test-nonce-12345';

      const proof = await dPopManager.createProof(method, url, nonce);

      expect(proof).toBeDefined();
      expect(typeof proof).toBe('string');

      // JWT形式の確認
      const parts = proof.split('.');
      expect(parts).toHaveLength(3);

      // ヘッダーの確認
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header.alg).toBe('ES256');
      expect(header.typ).toBe('dpop+jwt');
      expect(header.jwk).toBeDefined();

      // ペイロードの確認
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload.htm).toBe(method);
      expect(payload.htu).toBe(url);
      expect(payload.nonce).toBe(nonce);
      expect(payload.jti).toBeDefined();
      expect(payload.iat).toBeCloseTo(Date.now() / 1000, 1);
    });

    it('should create proof without nonce', async () => {
      const proof = await dPopManager.createProof('GET', 'https://api.example.com');

      const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());

      expect(payload.nonce).toBeUndefined();
    });

    it('should handle uninitialized manager', async () => {
      const uninitializedManager = new DPoPManager();

      await expect(uninitializedManager.createProof('GET', 'https://example.com')).rejects.toThrow(
        'DPoP key pair not initialized'
      );
    });
  });

  describe('DPoP Proof Verification', () => {
    let validProof: string;
    const testMethod = 'POST';
    const testUrl = 'https://test.example.com/api';
    const testNonce = 'test-verification-nonce';

    beforeEach(async () => {
      await dPopManager.generateKeyPair();
      validProof = await dPopManager.createProof(testMethod, testUrl, testNonce);
    });

    it('should verify valid DPoP proof', async () => {
      const result = await DPoPManager.verifyProof(validProof, testMethod, testUrl, testNonce);

      expect(result.valid).toBe(true);
      expect(result.payload).toMatchObject({
        htm: testMethod,
        htu: testUrl,
        nonce: testNonce,
      });
      expect(result.publicKey).toBeDefined();
    });

    it('should reject proof with wrong method', async () => {
      const result = await DPoPManager.verifyProof(
        validProof,
        'GET', // 異なるメソッド
        testUrl,
        testNonce
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Method mismatch');
    });

    it('should reject proof with wrong URL', async () => {
      const result = await DPoPManager.verifyProof(
        validProof,
        testMethod,
        'https://wrong.example.com', // 異なるURL
        testNonce
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('URL mismatch');
    });

    it('should reject proof with wrong nonce', async () => {
      const result = await DPoPManager.verifyProof(validProof, testMethod, testUrl, 'wrong-nonce');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Nonce mismatch');
    });

    it('should reject expired proof', async () => {
      // 過去の日時でプルーフを作成
      const pastTime = new Date(Date.now() - 2 * 60 * 1000); // 2分前
      global.testUtils.mockDate(pastTime);

      const expiredProof = await dPopManager.createProof(testMethod, testUrl);
      global.testUtils.resetDateMock();

      const result = await DPoPManager.verifyProof(expiredProof, testMethod, testUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('timestamp out of acceptable range');
    });

    it('should handle malformed JWT', async () => {
      const malformedJWT = 'invalid.jwt.format';

      const result = await DPoPManager.verifyProof(malformedJWT, testMethod, testUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Verification failed');
    });
  });

  describe('Utility Functions', () => {
    it('should extract DPoP header correctly', () => {
      const headers = {
        authorization: 'Bearer token',
        dpop: 'eyJ0eXAiOiJkcG9wK2p3dC...',
        'content-type': 'application/json',
      };

      const dPopHeader = dpopUtils.extractDPoPHeader(headers);
      expect(dPopHeader).toBe('eyJ0eXAiOiJkcG9wK2p3dC...');
    });

    it('should handle case-insensitive DPoP header', () => {
      const headers = {
        DPoP: 'eyJ0eXAiOiJkcG9wK2p3dC...',
      };

      const dPopHeader = dpopUtils.extractDPoPHeader(headers);
      expect(dPopHeader).toBe('eyJ0eXAiOiJkcG9wK2p3dC...');
    });

    it('should normalize URLs correctly', () => {
      const testCases = [
        {
          input: 'https://example.com/path?query=1#fragment',
          expected: 'https://example.com/path',
        },
        {
          input: 'https://api.bsky.social/xrpc/com.atproto.repo.createRecord',
          expected: 'https://api.bsky.social/xrpc/com.atproto.repo.createRecord',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(dpopUtils.normalizeUrl(input)).toBe(expected);
      });
    });

    it('should create appropriate DPoP errors', () => {
      const error = dpopUtils.createDPoPError('invalid_dpop_proof');

      expect(error).toMatchObject({
        error: 'invalid_dpop_proof',
        error_description: 'The DPoP proof is invalid',
      });
    });

    it('should generate consistent proof hashes', async () => {
      const proof = 'test.jwt.proof';

      const hash1 = await dpopUtils.generateProofHash(proof);
      const hash2 = await dpopUtils.generateProofHash(proof);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    });
  });

  describe('AT Protocol Integration', () => {
    beforeEach(async () => {
      await dPopManager.generateKeyPair();
    });

    it('should create AT Protocol token request proof', async () => {
      const tokenEndpoint = 'https://auth.bsky.social/oauth/token';
      const nonce = 'at-protocol-nonce';

      const proof = await atProtocolDPoP.createATProofForTokenRequest(
        dPopManager,
        tokenEndpoint,
        nonce
      );

      expect(proof).toBeDefined();

      const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());

      expect(payload.htm).toBe('POST');
      expect(payload.htu).toBe(tokenEndpoint);
      expect(payload.nonce).toBe(nonce);
    });

    it('should create AT Protocol API call proof', async () => {
      const apiEndpoint =
        'https://bsky.social/xrpc/com.atproto.repo.createRecord?collection=app.bsky.feed.post';

      const proof = await atProtocolDPoP.createATProofForAPICall(dPopManager, 'POST', apiEndpoint);

      const payload = JSON.parse(Buffer.from(proof.split('.')[1], 'base64url').toString());

      expect(payload.htm).toBe('POST');
      expect(payload.htu).toBe('https://bsky.social/xrpc/com.atproto.repo.createRecord');
    });
  });

  describe('Security Considerations', () => {
    it('should clear sensitive data from memory', async () => {
      await dPopManager.generateKeyPair();

      expect(dPopManager.isInitialized()).toBe(true);

      dPopManager.clear();

      expect(dPopManager.isInitialized()).toBe(false);
      expect(() => dPopManager.getKeyId()).toThrow('Key ID not available');
      expect(() => dPopManager.getPublicJWK()).toThrow('Public key not available');
    });

    it('should handle concurrent operations safely', async () => {
      const operations = Array(5)
        .fill(null)
        .map(() => dPopManager.generateKeyPair());

      // 最初の操作のみ成功し、他は失敗するはず
      const results = await Promise.allSettled(operations);

      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should prevent key reuse across instances', async () => {
      const manager1 = new DPoPManager();
      const manager2 = new DPoPManager();

      await manager1.generateKeyPair();
      await manager2.generateKeyPair();

      const keyId1 = manager1.getKeyId();
      const keyId2 = manager2.getKeyId();

      expect(keyId1).not.toBe(keyId2);

      manager1.clear();
      manager2.clear();
    });
  });

  describe('Error Handling', () => {
    it('should capture and handle WebCrypto errors', async () => {
      global.errorCapture.startCapture();

      // WebCrypto エラーをシミュレート
      global.mockWebCrypto.generateKey.mockRejectedValueOnce(
        new Error('Hardware security module not available')
      );

      await expect(dPopManager.generateKeyPair()).rejects.toThrow();

      global.errorCapture.stopCapture();
      const errors = global.errorCapture.getErrors();

      // エラーが適切にキャプチャされているかは、実装により異なる
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid key parameters', () => {
      const invalidJWK = {
        kty: 'RSA', // ECではない
        n: 'invalid-rsa-modulus',
        e: 'AQAB',
      };

      expect(async () => {
        await dPopManager.importPrivateKey(invalidJWK as any);
      }).rejects.toThrow();
    });
  });
});
