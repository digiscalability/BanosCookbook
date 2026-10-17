import crypto from 'crypto';

/**
 * Meta signs every webhook delivery with HMAC-SHA256 of the raw body, keyed with the
 * app secret, in `x-hub-signature-256: sha256=<hex>`. Missing, malformed or wrong
 * signatures all return false; the comparison is constant-time.
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(signatureHeader.trim());
  if (!match) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest();
  const received = Buffer.from(match[1], 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}
