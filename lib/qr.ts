/**
 * The link a verification QR code (and the "copy link" button) points at:
 * this site's /verify page with the document's token.
 *
 * The token is trimmed because the database column can pad short values with
 * spaces, and it is built from the current site address so the link always
 * matches where the app is actually served.
 */
export function verifyUrlFor(token: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  return `${origin}/verify?token=${encodeURIComponent(token.trim())}`;
}
