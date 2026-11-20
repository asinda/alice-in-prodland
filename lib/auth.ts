import { SignJWT, jwtVerify } from 'jose';

const encode = (s: string) => new TextEncoder().encode(s);

/** Secret HS256. En production, absent ou < 32 caractères => erreur (pas de fallback public). */
export function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum)');
    }
    return encode('dev-only-insecure-secret-never-use-in-production');
  }
  return encode(s);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}
