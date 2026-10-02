import type { PlatformRole } from '@mawjood/contracts';
import { Logger } from '@nestjs/common';
import {
  calculateJwkThumbprint,
  type CryptoKey,
  errors,
  exportJWK,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
} from 'jose';

import type { AppConfig } from '../../config/config.ts';

const ALG = 'ES256';
const ISSUER = 'mawjood-api';
const AUDIENCE = 'mawjood-app';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export type AccessClaims = { userId: string; sessionId: string; role: PlatformRole };

export class TokenExpiredError extends Error {}
export class TokenInvalidError extends Error {}

/**
 * Short-lived ES256 access tokens (docs/SECURITY_MODEL.md §2). Keys come from configuration;
 * development and test generate an ephemeral pair (tokens then die with the process).
 */
export class TokenService {
  private constructor(
    private readonly privateKey: CryptoKey,
    private readonly publicKey: CryptoKey,
    private readonly kid: string,
  ) {}

  static async create(config: AppConfig): Promise<TokenService> {
    let privateKey: CryptoKey;
    let publicKey: CryptoKey;
    if (config.jwt.privateKeyPem && config.jwt.publicKeyPem) {
      privateKey = await importPKCS8(config.jwt.privateKeyPem, ALG);
      publicKey = await importSPKI(config.jwt.publicKeyPem, ALG, { extractable: true });
    } else {
      if (config.appEnv === 'staging' || config.appEnv === 'production') {
        throw new Error('JWT keys are required outside development and test');
      }
      new Logger('TokenService').warn(
        'No JWT keys configured: using an ephemeral development key pair',
      );
      ({ privateKey, publicKey } = await generateKeyPair(ALG));
    }
    const kid = await calculateJwkThumbprint(await exportJWK(publicKey));
    return new TokenService(privateKey, publicKey, kid);
  }

  async signAccess(claims: AccessClaims): Promise<{ token: string; expiresAt: Date }> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ACCESS_TOKEN_TTL_SECONDS;
    const token = await new SignJWT({ sid: claims.sessionId, role: claims.role })
      .setProtectedHeader({ alg: ALG, kid: this.kid, typ: 'JWT' })
      .setSubject(claims.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(this.privateKey);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: [ALG],
      });
      const { sub, sid, role } = payload;
      if (
        typeof sub !== 'string' ||
        typeof sid !== 'string' ||
        (role !== 'CUSTOMER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN')
      ) {
        throw new TokenInvalidError('Malformed claims');
      }
      return { userId: sub, sessionId: sid, role };
    } catch (error) {
      if (error instanceof errors.JWTExpired) throw new TokenExpiredError('Token expired');
      if (error instanceof TokenInvalidError) throw error;
      throw new TokenInvalidError('Token invalid');
    }
  }
}
