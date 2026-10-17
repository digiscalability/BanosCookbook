import type { NextApiRequest, NextApiResponse } from 'next';

import { safeFetch, UnsafeUrlError } from '@/server/net/ssrf-guard';

// Small resolver that follows redirects for known image hosts (like source.unsplash.com)
// and returns the final URL, or the bytes as a data URI when small. Guarded so it
// cannot be used as an open proxy: https only, exact allowlisted hosts (or their
// subdomains), public addresses only, every redirect hop re-checked.

const TRUSTED_RESOLVE_HOSTS = [
  'source.unsplash.com',
  'images.unsplash.com',
  'picsum.photos',
  'placehold.co',
] as const;
const MAX_EMBED_BYTES = 3 * 1024 * 1024; // 3MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { url } = (req.body || {}) as { url?: unknown };
  if (!url || typeof url !== 'string' || url.length > 2048) {
    return res.status(400).json({ error: 'Missing url' });
  }

  try {
    const resp = await safeFetch(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'image/*,*/*;q=0.8',
        },
      },
      { allowHosts: TRUSTED_RESOLVE_HOSTS, timeoutMs: 5000, maxRedirects: 3 }
    );

    const finalUrl = resp.url || url;
    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.startsWith('image/')) {
      const declared = Number(resp.headers.get('content-length') ?? 0);
      if (declared && declared > MAX_EMBED_BYTES) return res.status(200).json({ resolvedUrl: finalUrl });
      const buf = await resp.arrayBuffer();
      if (buf.byteLength <= MAX_EMBED_BYTES) {
        const base64 = Buffer.from(buf).toString('base64');
        return res
          .status(200)
          .json({ resolvedUrl: finalUrl, dataUri: `data:${contentType};base64,${base64}` });
      }
    }
    return res.status(200).json({ resolvedUrl: finalUrl });
  } catch (err) {
    if (err instanceof UnsafeUrlError) return res.status(400).json({ error: err.message });
    return res.status(502).json({ error: 'Failed to fetch or resolve URL' });
  }
}
