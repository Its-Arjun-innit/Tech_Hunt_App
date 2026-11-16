import { randomBytes, randomInt } from "crypto";

// Crockford-ish base32 without look-alike characters (0/O, 1/I/L).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function randomString(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Opaque public attendance-session token, e.g. at_x8k29fq2mz. Never a database id. */
export function generateAttendanceToken(): string {
  return `at_${randomString(10)}`;
}

/** Session token for the student/staff cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cryptographically random 6-digit PIN, zero padded. */
export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Readable temporary password for new staff, e.g. "kq7m-x2pd". */
export function generatePassword(): string {
  return `${randomString(4)}-${randomString(4)}`;
}

/**
 * Public origin the attendance QR points at.
 *
 * On Vercel the production URL is provided automatically. Getting this wrong
 * means a QR no phone can open, so it is derived rather than hand-set.
 */
export function appUrl(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

/** URL encoded into the rotating attendance QR. */
export function attendanceUrl(token: string, code: string, origin = appUrl()): string {
  return `${origin}/a/${token}?c=${code}`;
}
