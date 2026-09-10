import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'teatro-aec');
const ALG = 'HS256';

export async function signAdminToken() {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAdminToken(token: string) {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
