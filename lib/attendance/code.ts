import { createHmac, randomBytes } from "crypto";

/**
 * The rotating six-digit class code.
 *
 * code = HMAC(session secret, 20-second window), like an authenticator app.
 * Nothing is stored per rotation and no job rotates anything: the code for
 * any moment is computed on demand. A code is accepted during its own window
 * and the one after, so it lives at most 40 seconds. A photo of the projector
 * sent to a friend in the hostel is dead before they open the app.
 */
export const WINDOW_MS = 20_000;

export function newSecret(): string {
  return randomBytes(20).toString("base64url");
}

function windowOf(t: number) {
  return Math.floor(t / WINDOW_MS);
}

function codeFor(secret: string, window: number): string {
  const mac = createHmac("sha256", secret).update(String(window)).digest();
  // RFC 4226 dynamic truncation.
  const offset = mac[mac.length - 1] & 0xf;
  const n = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(n % 1_000_000).padStart(6, "0");
}

export function currentCode(secret: string, now: number = Date.now()) {
  const w = windowOf(now);
  return { code: codeFor(secret, w), msLeft: (w + 1) * WINDOW_MS - now };
}

export function verifyCode(secret: string, code: string, now: number = Date.now()): boolean {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const w = windowOf(now);
  return clean === codeFor(secret, w) || clean === codeFor(secret, w - 1);
}
