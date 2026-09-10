import { randomBytes, randomInt } from "crypto";

// Crockford-ish base32 without look-alike characters (0/O, 1/I/L).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function randomString(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Opaque public checkpoint token, e.g. cp_x8k29fq2mz. Never a database id. */
export function generateQrToken(): string {
  return `cp_${randomString(10)}`;
}

/** Session token for the player/admin cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Short human-friendly team code, e.g. TM-4KQ7. */
export function generateTeamCode(): string {
  return `TM-${randomString(4).toUpperCase()}`;
}

/** Cryptographically random 6-digit PIN, zero padded. */
export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** URL encoded into a checkpoint QR poster. */
export function scanUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/scan/${token}`;
}

/** Accepts a full scan URL or a bare token and returns the token. */
export function extractToken(raw: string): string | null {
  const match = raw.trim().match(/(?:^|\/scan\/)(cp_[a-z0-9]+)\/?$/i);
  return match ? match[1] : null;
}
