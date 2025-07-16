import { DPoPManager } from '../oauth/dpop-manager';
import { TokenManager } from '../oauth/token-manager';
import type { ScheduledPost, JsonWebKey } from 'shared';

/**
 * BlueskyApiClient class - Handles communication with the Bluesky API
 */
export class BlueskyApiClient {
  private baseUrl: string;
  private dPopManager: DPoPManager;
  private tokenManager: TokenManager;

  /**
   * Create a new BlueskyApiClient instance
   * @param baseUrl Base URL for the Bluesky API
   * @param dPopManager DPoP manager instance
   * @param tokenManager Token manager instance
   */
  constructor(baseUrl: string, dPopManager: DPoPManager, tokenManager: TokenManager) {
    this.baseUrl = baseUrl;
    this.dPopManager = dPopManager;
    this.tokenManager = tokenManager;
  }

  /**
   * Make an authenticated request to the Bluesky API
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param userId User ID
   * @param body Request body
   * @returns Response data
   */
  async makeRequest(endpoint: string, method: string, userId: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get tokens for the user
    const { sessionId, accessToken, refreshToken, expiresAt, dPopPrivateKey } =
      await this.tokenManager.getTokensForUser(userId);

    // Check if token is expired and refresh if needed
    const now = new Date();
    let token = accessToken;
    let privateKey = dPopPrivateKey;

    if (expiresAt <= now) {
      try {
        // Refresh the token
        const newTokens = await this.refreshToken(userId, sessionId, refreshToken, dPopPrivateKey);
        token = newTokens.accessToken;
        privateKey = newTokens.dPopPrivateKey;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw new Error('Authentication failed: token expired and refresh failed');
      }
    }

    // Create DPoP proof
    const dPopProof = await this.dPopManager.createProof(method, url, privateKey);

    // Set up request options
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        DPoP: dPopProof,
        'Content-Type': 'application/json',
      },
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(url, options);

    // Check if the response has a DPoP-Nonce header for the next request
    // const dPopNonce = response.headers.get('DPoP-Nonce');
    // TODO: Store the nonce for future requests if needed

    // Handle errors
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Unknown error' };
      }

      throw new Error(`API request failed: ${response.status} ${JSON.stringify(errorData)}`);
    }

    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return data;
  }

  /**
   * Refresh the access token
   * @param userId User ID
   * @param sessionId Session ID
   * @param refreshToken Refresh token
   * @param dPopPrivateKey DPoP private key
   * @returns New tokens
   */
  private async refreshToken(
    _userId: string,
    _sessionId: string,
    _refreshToken: string,
    _dPopPrivateKey: JsonWebKey
  ): Promise<{
    accessToken: string;
    dPopPrivateKey: JsonWebKey;
  }> {
    // TODO: Implement refresh token logic with OAuthClient
    // This is a placeholder and should be implemented with the actual refresh logic
    throw new Error('Refresh token not implemented');
  }

  /**
   * Create a post on Bluesky
   * @param userId User ID
   * @param post Post data
   * @returns Post reference
   */
  async createPost(
    userId: string,
    post: ScheduledPost
  ): Promise<{
    uri: string;
    cid: string;
  }> {
    const endpoint = '/xrpc/com.atproto.repo.createRecord';

    const postBody = {
      repo: '', // Will be filled by the API based on the token
      collection: 'app.bsky.feed.post',
      record: {
        text: post.content,
        createdAt: new Date().toISOString(),
        langs: ['en'], // Default language
      },
    };

    const response = await this.makeRequest(endpoint, 'POST', userId, postBody);

    return {
      uri: response.uri,
      cid: response.cid,
    };
  }

  /**
   * Get a post from Bluesky
   * @param userId User ID
   * @param uri Post URI
   * @returns Post data
   */
  async getPost(userId: string, uri: string): Promise<any> {
    const endpoint = '/xrpc/com.atproto.repo.getRecord';
    const [repoName, collection, rkey] = uri.replace('at://', '').split('/');

    const params = new URLSearchParams();
    if (repoName) params.append('repo', repoName);
    if (collection) params.append('collection', collection);
    if (rkey) params.append('rkey', rkey);

    return this.makeRequest(`${endpoint}?${params.toString()}`, 'GET', userId);
  }

  /**
   * Delete a post from Bluesky
   * @param userId User ID
   * @param uri Post URI
   * @returns Success status
   */
  async deletePost(userId: string, uri: string): Promise<boolean> {
    const endpoint = '/xrpc/com.atproto.repo.deleteRecord';
    const [repoName, collection, rkey] = uri.replace('at://', '').split('/');

    const body = {
      repo: repoName,
      collection,
      rkey,
    };

    await this.makeRequest(endpoint, 'POST', userId, body);
    return true;
  }
}
