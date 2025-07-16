// Global type definitions that aren't included in standard TypeScript libraries

/**
 * JSON Web Key type definition
 * Used for DPoP key pairs in OAuth authentication
 */
export interface JsonWebKey {
  kty: string; // Key type (e.g., 'EC', 'RSA')
  crv?: string; // Curve for EC keys (e.g., 'P-256')
  x?: string; // X coordinate for EC keys
  y?: string; // Y coordinate for EC keys
  d?: string; // Private key component (for private keys only)
  n?: string; // Modulus for RSA keys
  e?: string; // Exponent for RSA keys
  alg?: string; // Algorithm (e.g., 'ES256', 'RS256')
  use?: string; // Public key use (e.g., 'sig', 'enc')
  kid?: string; // Key ID
  [key: string]: unknown; // Allow additional properties
}
