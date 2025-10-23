import type { NextApiRequest, NextApiResponse } from 'next';

// Very small-safe resolver endpoint that follows redirects for known redirecting
// hosts (like source.unsplash.com) and returns the final URL or the image bytes
// as base64 when appropriate. Keep this small and guarded to avoid open proxy abuse.

const TRUSTED_RESOLVE_HOSTS = [
  'source.unsplash.com',
  'images.unsplash.com',
  'picsum.photos',
  'placehold.co',
];
const MAX_EMBED_BYTES = 3 * 1024 * 1024; // 3MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!TRUSTED_RESOLVE_HOSTS.some(h => parsed.hostname.endsWith(h))) {
      return res.status(400).json({ error: 'Host not allowed' });
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 5000) : undefined;

    try {
      const resp = await fetch(url, {
        method: 'GET',
        signal: controller?.signal,
        // use browser-like headers to improve success
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Accept: 'image/*,*/*;q=0.8',
        },
      });

      if (timer) clearTimeout(timer);

      // If fetch was redirected, resp.url will be the final URL (or same as input)
      const finalUrl = resp.url || url;

      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.startsWith('image/')) {
        // If response byte-size small enough, return a data URI to guarantee rendering
        const buf = await resp.arrayBuffer();
        if (buf.byteLength <= MAX_EMBED_BYTES) {
          const base64 = Buffer.from(buf).toString('base64');
          return res
            .status(200)
            .json({ resolvedUrl: finalUrl, dataUri: `data:${contentType};base64,${base64}` });
        }
        return res.status(200).json({ resolvedUrl: finalUrl });
      }

      return res.status(200).json({ resolvedUrl: finalUrl });
    } catch {
      if (timer) clearTimeout(timer);
      return res.status(502).json({ error: 'Failed to fetch or resolve URL' });
    }
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}
