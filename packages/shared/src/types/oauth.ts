// OAuth related types and constants
import { JsonWebKey } from './global';

// OAuth configuration
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  provider: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

// PKCE (Proof Key for Code Exchange) related types
export interface PKCECodes {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

// DPoP (Demonstrating Proof of Possession) related types
export interface DPoPKeyPair {
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
}

export interface DPoPProof {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  nonce?: string;
}

// BlueskyOAuth Client Metadata
export interface ClientMetadata {
  client_id: string;
  application_type: 'web' | 'native';
  dpop_bound_access_tokens: boolean;
  grant_types: string[];
  response_types: string[];
  scope: string;
  token_endpoint_auth_method: string;
  require_pkce: boolean;
}

// The standard OAuth2 client metadata for Bluesky
export const DEFAULT_CLIENT_METADATA: ClientMetadata = {
  client_id: 'https://example.com/.well-known/bluesky-oauth.json',
  application_type: 'web',
  dpop_bound_access_tokens: true,
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  scope: 'atproto transition:generic',
  token_endpoint_auth_method: 'none',
  require_pkce: true,
};

// Bluesky OAuth endpoints
export const BLUESKY_OAUTH_ENDPOINTS = {
  authorization: 'https://bsky.app/authorize',
  token: 'https://bsky.app/oauth/token',
};

// Token types
export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope?: string;
  dPopKeyPair?: DPoPKeyPair;
}

// OAuth states stored in session
export interface OAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
}
