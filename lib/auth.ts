import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod'
);

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
