/**
 * SSRF guard for any server-side fetch of a user-supplied URL.
 *
 * - https only, default port, no credentials in the URL
 * - hostname must resolve only to public addresses (no loopback, RFC1918, link-local,
 *   CGNAT, metadata ranges, ULA, multicast, IPv4-mapped private addresses)
 * - redirects are followed manually and every hop is re-checked
 *
 * Residual risk: DNS can change between the check and fetch()'s own lookup (rebinding).
 * Callers that need more should fetch through a fixed egress proxy.
 */
import { lookup } from 'node:dns/promises';
import net from 'node:net';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(addr, prefix, 'ipv4');
}
for (const [addr, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(addr, prefix, 'ipv6');
}

export function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return blocked.check(ip, 'ipv4');
  if (family === 6) {
    // BlockList checks IPv4-mapped IPv6 (::ffff:a.b.c.d) against the IPv4 rules too.
    return blocked.check(ip, 'ipv6');
  }
  return true; // not an IP literal we understand: treat as unsafe
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];

export interface UrlPolicy {
  /** Optional allowlist: exact host or any subdomain of it. */
  allowHosts?: readonly string[];
}

export async function assertPublicHttpsUrl(raw: string, policy: UrlPolicy = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (url.protocol !== 'https:') throw new UnsafeUrlError('Only https URLs are allowed');
  if (url.username || url.password) throw new UnsafeUrlError('Credentials in URL are not allowed');
  if (url.port && url.port !== '443') throw new UnsafeUrlError('Non-default ports are not allowed');

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some(s => host.endsWith(s))) {
    throw new UnsafeUrlError('Host not allowed');
  }
  if (policy.allowHosts && !policy.allowHosts.some(h => host === h || host.endsWith(`.${h}`))) {
    throw new UnsafeUrlError('Host not allowed');
  }

  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new UnsafeUrlError('Private address not allowed');
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError('Host does not resolve');
  }
  if (addresses.length === 0 || addresses.some(a => isPrivateAddress(a.address))) {
    throw new UnsafeUrlError('Host resolves to a private address');
  }
  return url;
}

export interface SafeFetchOptions extends UrlPolicy {
  maxRedirects?: number;
  timeoutMs?: number;
}

/** fetch() that refuses non-public targets, re-checking every redirect hop. */
export async function safeFetch(
  raw: string,
  init: RequestInit = {},
  { maxRedirects = 3, timeoutMs = 8000, ...policy }: SafeFetchOptions = {}
): Promise<Response> {
  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicHttpsUrl(current, policy);
    const res = await fetch(url, {
      ...init,
      redirect: 'manual',
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  throw new UnsafeUrlError('Too many redirects');
}
