import * as crypto from 'crypto';
import type { OAuthSession, OAuthToken, JsonWebKey } from 'shared';
import { prisma } from '../../lib/prisma';

/**
 * TokenManager class - Handles the secure storage and retrieval of OAuth tokens
 */
export class TokenManager {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  /**
   * Create a new TokenManager instance
   * @param encryptionKey The encryption key used to secure tokens (from environment)
   */
  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
    // Derive a key from the provided string
    this.encryptionKey = crypto.createHash('sha256').update(encryptionKey).digest();
  }

  /**
   * Encrypt a token for secure storage
   * @param text The text to encrypt (token)
   * @returns The encrypted text with IV and auth tag
   */
  encrypt(text: string): string {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    // Encrypt the token
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Get the authentication tag
    const authTag = cipher.getAuthTag().toString('hex');
    // Return everything needed for decryption
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt a stored token
   * @param encryptedText The encrypted text with IV and auth tag
   * @returns The decrypted token
   */
  decrypt(encryptedText: string): string {
    // Split the parts
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted text format');
    }

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the token
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store OAuth tokens in the database (encrypted)
   * @param userId User ID
   * @param tokens OAuth tokens to store
   * @param dPopPrivateKey DPoP private key (JWK format)
   * @param dPopPublicKey DPoP public key (JWK format)
   * @returns The created session
   */
  async storeTokens(
    userId: string,
    tokens: OAuthToken,
    dPopPrivateKey: JsonWebKey,
    dPopPublicKey: JsonWebKey
  ): Promise<OAuthSession> {
    // Calculate expiration dates
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expiresIn * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Encrypt tokens for storage
    const encryptedAccessToken = this.encrypt(tokens.accessToken);
    const encryptedRefreshToken = this.encrypt(tokens.refreshToken);
    const encryptedPrivateKey = this.encrypt(JSON.stringify(dPopPrivateKey));
    const publicKeyString = JSON.stringify(dPopPublicKey);

    // Store in the database
    const session = await prisma.oAuthSession.create({
      data: {
        userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        dPopPrivateKey: encryptedPrivateKey,
        dPopPublicKey: publicKeyString,
        expiresAt,
        refreshExpiresAt,
        isActive: true,
      },
    });

    return session;
  }

  /**
   * Update tokens in an existing session
   * @param sessionId Session ID
   * @param tokens New OAuth tokens
   * @returns The updated session
   */
  async updateTokens(sessionId: string, tokens: OAuthToken): Promise<OAuthSession> {
    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expiresIn * 1000);

    // Encrypt tokens for storage
    const encryptedAccessToken = this.encrypt(tokens.accessToken);
    const encryptedRefreshToken = this.encrypt(tokens.refreshToken);

    // Update in the database
    const session = await prisma.oAuthSession.update({
      where: { id: sessionId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        isActive: true,
      },
    });

    return session;
  }

  /**
   * Get tokens from a session
   * @param sessionId Session ID
   * @returns Decrypted tokens and DPoP key pair
   */
  async getTokens(sessionId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    dPopPrivateKey: JsonWebKey;
    dPopPublicKey: JsonWebKey;
  }> {
    // Get from database
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive) {
      throw new Error('Session is inactive');
    }

    // Decrypt tokens
    const accessToken = this.decrypt(session.accessToken);
    const refreshToken = this.decrypt(session.refreshToken);
    const dPopPrivateKey = JSON.parse(this.decrypt(session.dPopPrivateKey)) as JsonWebKey;
    const dPopPublicKey = JSON.parse(session.dPopPublicKey) as JsonWebKey;

    return {
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
      dPopPrivateKey,
      dPopPublicKey,
    };
  }

  /**
   * Get tokens for a user (most recent active session)
   * @param userId User ID
   * @returns Decrypted tokens and DPoP key pair from the most recent session
   */
  async getTokensForUser(userId: string): Promise<{
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    dPopPrivateKey: JsonWebKey;
    dPopPublicKey: JsonWebKey;
  }> {
    // Get most recent active session
    const session = await prisma.oAuthSession.findFirst({
      where: {
        userId,
        isActive: true,
        refreshExpiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!session) {
      throw new Error('No active session found for user');
    }

    // Decrypt tokens
    const accessToken = this.decrypt(session.accessToken);
    const refreshToken = this.decrypt(session.refreshToken);
    const dPopPrivateKey = JSON.parse(this.decrypt(session.dPopPrivateKey)) as JsonWebKey;
    const dPopPublicKey = JSON.parse(session.dPopPublicKey) as JsonWebKey;

    return {
      sessionId: session.id,
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
      dPopPrivateKey,
      dPopPublicKey,
    };
  }

  /**
   * Revoke a session
   * @param sessionId Session ID
   * @returns The updated session
   */
  async revokeSession(sessionId: string): Promise<OAuthSession> {
    return prisma.oAuthSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  /**
   * Revoke all sessions for a user
   * @param userId User ID
   * @returns The number of sessions revoked
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await prisma.oAuthSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return result.count;
  }
}
