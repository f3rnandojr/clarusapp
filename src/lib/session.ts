import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-key-for-session-encryption';
const key = new TextEncoder().encode(secretKey);

export function generateSessionId(): string {
  return globalThis.crypto.randomUUID();
}

export async function encrypt(payload: any): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key);
}

// Pure JWT decode — safe for Edge Runtime (no DB access)
export async function decryptJWT(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

// Full session validation: JWT + server-side invalidation check.
// NOT safe for Edge Runtime — use only in server components / actions / API routes.
export async function getSession() {
  const cookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  const payload = await decryptJWT(cookie);
  if (!payload) return null;

  if (payload.sessionId) {
    const { dbConnect } = await import('./db');
    const db = await dbConnect();
    const inv = await db.collection('invalidated_sessions').findOne({ sessionId: payload.sessionId });
    if (inv) {
      console.log(`[Session] Blocked invalidated session ${payload.sessionId} (user: ${payload.user?.login})`);
      return null;
    }
  }

  return payload;
}

// Mark a session as invalid in MongoDB so future requests are rejected immediately.
export async function invalidateSession(sessionId: string, login: string): Promise<void> {
  try {
    const { dbConnect } = await import('./db');
    const db = await dbConnect();
    await db.collection('invalidated_sessions').insertOne({
      sessionId,
      login,
      invalidatedAt: new Date(),
    });
    console.log(`[Session] Invalidated session ${sessionId} (user: ${login})`);
  } catch (err) {
    console.error('[Session] Failed to record invalidated session:', err);
  }
}
