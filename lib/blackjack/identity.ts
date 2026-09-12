import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { PROGRESS_VERSION } from './progress';

export const PLAYER_COOKIE = 'jacklet-player';
export function storageEnvironment() {
  return process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
}
function signature(id: string) {
  const key = process.env.PUZZLE_SECRET || (process.env.NODE_ENV !== 'production' ? 'blackjack-local-development' : '');
  if (!key) throw new Error('PUZZLE_SECRET is required in production.');
  return createHmac('sha256', key).update(`player:${storageEnvironment()}:${PROGRESS_VERSION}:${id}`).digest('base64url');
}
export function playerToken(id: string) { return `${id}.${signature(id)}`; }
export function playerFrom(request: Request): string | null {
  const value = request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${PLAYER_COOKIE}=`))?.slice(PLAYER_COOKIE.length + 1);
  if (!value) return null;
  const [id, mac, extra] = value.split('.');
  if (extra !== undefined || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) || !mac) return null;
  const expected = Buffer.from(signature(id)), actual = Buffer.from(mac);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}
export function newPlayer() { return randomUUID(); }
export function withPlayer(response: Response, id: string) {
  response.headers.append('Set-Cookie', `${PLAYER_COOKIE}=${playerToken(id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return response;
}
