import { randomUUID } from 'crypto';
import * as jose from 'jose';
import type { DPoPKeyPair, DPoPProof, JsonWebKey } from 'shared';

/**
 * DPoPManager class - Handles DPoP (Demonstrating Proof of Possession) operations
 * for OAuth authentication with Bluesky.
 */
export class DPoPManager {
  /**
   * Generates a new ES256 key pair for DPoP
   * @returns Promise<DPoPKeyPair> The generated key pair
   */
  async generateKeyPair(): Promise<DPoPKeyPair> {
    // Generate ES256 key pair as required by Bluesky
    const keyPair = await jose.generateKeyPair('ES256', {
      extractable: true,
    });

    // Export keys to JWK format
    const privateKey = await jose.exportJWK(keyPair.privateKey);
    const publicKey = await jose.exportJWK(keyPair.publicKey);

    return { privateKey, publicKey };
  }

  /**
   * Creates a DPoP proof JWT
   * @param method HTTP method for the request
   * @param url Target URL for the request
   * @param jwk Private key in JWK format
   * @param serverNonce Optional server nonce for subsequent requests
   * @returns Promise<string> The DPoP proof JWT
   */
  async createProof(
    method: string,
    url: string,
    jwk: JsonWebKey,
    serverNonce?: string
  ): Promise<string> {
    // Create the private key from JWK
    const privateKey = await jose.importJWK(jwk, 'ES256');

    // Create the public key for the header
    const publicJwk = { ...jwk };
    // Remove private key components
    delete publicJwk.d;
    delete publicJwk.dp;
    delete publicJwk.dq;
    delete publicJwk.p;
    delete publicJwk.q;
    delete publicJwk.qi;

    // Prepare the DPoP proof payload
    const payload: DPoPProof = {
      jti: randomUUID(), // Unique identifier
      htm: method, // HTTP method
      htu: url, // HTTP URL
      iat: Math.floor(Date.now() / 1000), // Issued at time
    };

    // Add server nonce if provided
    if (serverNonce) {
      payload.nonce = serverNonce;
    }

    // Create the DPoP proof JWT
    const dPoPProof = await new jose.SignJWT(payload)
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: publicJwk,
      })
      .sign(privateKey);

    return dPoPProof;
  }

  /**
   * Verifies a DPoP proof JWT
   * @param proof DPoP proof JWT string
   * @param method Expected HTTP method
   * @param url Expected target URL
   * @param maxAgeSeconds Maximum allowed age of the proof in seconds
   * @returns Promise<boolean> Whether the proof is valid
   */
  async verifyProof(
    proof: string,
    method: string,
    url: string,
    maxAgeSeconds = 60
  ): Promise<boolean> {
    try {
      // Decode the JWT header to extract the public key
      const { header } = jose.decodeJwt(proof);
      const jwk = header.jwk as JsonWebKey;

      if (!jwk) {
        throw new Error('No JWK found in DPoP proof header');
      }

      // Import the public key from JWK
      const publicKey = await jose.importJWK(jwk, 'ES256');

      // Verify the JWT signature and payload
      const { payload } = await jose.jwtVerify(proof, publicKey);

      // Check the JWT type
      if (header.typ !== 'dpop+jwt') {
        throw new Error('Invalid token type');
      }

      // Validate payload content
      if (
        payload.htm !== method ||
        payload.htu !== url ||
        typeof payload.jti !== 'string' ||
        typeof payload.iat !== 'number'
      ) {
        throw new Error('Invalid DPoP proof payload');
      }

      // Verify the token age
      const now = Math.floor(Date.now() / 1000);
      if (payload.iat < now - maxAgeSeconds) {
        throw new Error('DPoP proof expired');
      }

      return true;
    } catch (error) {
      console.error('DPoP proof verification failed:', error);
      return false;
    }
  }

  /**
   * Extracts the thumbprint from a DPoP proof JWT
   * @param proof DPoP proof JWT string
   * @returns Promise<string> The JWK thumbprint (base64url encoded)
   */
  async getThumbprint(proof: string): Promise<string> {
    try {
      // Decode the JWT header to extract the public key
      const { header } = jose.decodeJwt(proof);
      const jwk = header.jwk as JsonWebKey;

      if (!jwk) {
        throw new Error('No JWK found in DPoP proof header');
      }

      // Calculate the thumbprint of the JWK
      const thumbprint = await jose.calculateJwkThumbprint(jwk);
      return thumbprint;
    } catch (error) {
      console.error('Failed to extract thumbprint from DPoP proof:', error);
      throw error;
    }
  }
}
