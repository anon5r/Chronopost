import { prisma } from '../../lib/prisma';
import type { OAuthSession, OAuthState, User } from 'shared';
import { randomBytes } from 'crypto';

/**
 * SessionManager class - Manages OAuth session state and user sessions
 */
export class SessionManager {
  private states: Map<string, OAuthState>;
  private stateExpiryMs: number;

  /**
   * Create a new SessionManager instance
   * @param stateExpiryMs Time in milliseconds before a state expires (default: 10 minutes)
   */
  constructor(stateExpiryMs = 10 * 60 * 1000) {
    this.states = new Map();
    this.stateExpiryMs = stateExpiryMs;

    // Set up periodic cleanup of expired states
    setInterval(() => this.cleanupExpiredStates(), stateExpiryMs / 2);
  }

  /**
   * Create a new state for the OAuth flow
   * @param codeVerifier PKCE code verifier
   * @param redirectUri Redirect URI for the OAuth flow
   * @returns The generated state string
   */
  createState(codeVerifier: string, redirectUri: string): string {
    // Generate a random state
    const state = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.stateExpiryMs;

    // Store the state with its metadata
    this.states.set(state, {
      state,
      codeVerifier,
      redirectUri,
      expiresAt,
    });

    return state;
  }

  /**
   * Get state data and verify it
   * @param state State string to verify
   * @returns The state data if valid
   * @throws Error if state is invalid or expired
   */
  getState(state: string): OAuthState {
    const stateData = this.states.get(state);

    if (!stateData) {
      throw new Error('Invalid state parameter');
    }

    if (stateData.expiresAt < Date.now()) {
      this.states.delete(state);
      throw new Error('State parameter expired');
    }

    // Delete the state after it's been used
    this.states.delete(state);

    return stateData;
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.states.entries()) {
      if (data.expiresAt < now) {
        this.states.delete(state);
      }
    }
  }

  /**
   * Find user by their DID (Decentralized Identifier)
   * @param did User's DID
   * @returns User if found, null otherwise
   */
  async findUserByDid(did: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { did },
    });
  }

  /**
   * Create a new user or update an existing one
   * @param userData User data from Bluesky
   * @returns The created or updated user
   */
  async createOrUpdateUser(userData: {
    did: string;
    handle: string;
    displayName?: string;
  }): Promise<User> {
    return prisma.user.upsert({
      where: { did: userData.did },
      create: {
        did: userData.did,
        handle: userData.handle,
        displayName: userData.displayName,
        isActive: true,
      },
      update: {
        handle: userData.handle,
        displayName: userData.displayName,
        isActive: true,
      },
    });
  }

  /**
   * Get all active sessions for a user
   * @param userId User ID
   * @returns Array of active sessions
   */
  async getUserSessions(userId: string): Promise<OAuthSession[]> {
    return prisma.oAuthSession.findMany({
      where: {
        userId,
        isActive: true,
        refreshExpiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Check if a user has any active sessions
   * @param userId User ID
   * @returns Whether the user has any active sessions
   */
  async hasActiveSessions(userId: string): Promise<boolean> {
    const count = await prisma.oAuthSession.count({
      where: {
        userId,
        isActive: true,
        refreshExpiresAt: { gt: new Date() },
      },
    });

    return count > 0;
  }

  /**
   * Find session by ID and verify it's active
   * @param sessionId Session ID
   * @returns Session if found and active
   * @throws Error if session not found or inactive
   */
  async getSessionById(sessionId: string): Promise<OAuthSession> {
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive) {
      throw new Error('Session is inactive');
    }

    if (session.refreshExpiresAt < new Date()) {
      throw new Error('Session has expired');
    }

    return session;
  }
}
