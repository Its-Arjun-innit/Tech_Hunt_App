/**
 * Reads what the in-app scanner saw: a full attendance link, or a bare
 * six-digit code. Returns null for anything else, such as a menu QR.
 * Lives apart from token.ts because it runs in the browser.
 */
export function parseScan(raw: string): { token: string | null; code: string } | null {
  const url = /\/a\/(at_[a-z0-9]+)\/?\?c=(\d{6})\b/i.exec(raw);
  if (url) return { token: url[1], code: url[2] };
  const bare = /^\s*(\d{3})\s?(\d{3})\s*$/.exec(raw);
  return bare ? { token: null, code: bare[1] + bare[2] } : null;
}
