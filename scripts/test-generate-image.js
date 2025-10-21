#!/usr/bin/env node
/**
 * Test runner that calls the server action endpoint to generate images for a sample recipe.
 * This script runs locally and requires the dev server or production server to accept this call.
 * It calls the internal server action by making a POST to /api/test-generate-image (we'll add an API route next)
 */

let fetchFunc = null;
try {
  // Node 18+ often exposes global fetch; prefer that. Otherwise try undici.
  if (typeof fetch === 'function') fetchFunc = fetch;
} catch (e) {}

if (!fetchFunc) {
  try {
    // eslint-disable-next-line global-require
    const undici = require('undici');
    fetchFunc = undici.fetch;
  } catch (e) {
    // Fallback to simple https request
    const https = require('https');
    fetchFunc = (url, opts = {}) => new Promise((resolve, reject) => {
      try {
        const parsed = new URL(url);
        const body = opts.body;
        const headers = opts.headers || {};
        const req = https.request({ method: opts.method || 'GET', hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers }, (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', chunk => data += chunk);
          res.on('end', () => ({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data)),
          }) ? resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }) : resolve({ status: res.statusCode, ok: false, text: () => Promise.resolve(data), json: () => Promise.resolve({}) }));
        });
        if (body) req.write(body);
        req.on('error', reject);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

async function main() {
  const url = process.env.TEST_SERVER_URL || 'http://localhost:9002/api/test-generate-image';
  console.log('Calling', url);

  const body = {
    title: 'Chocolate Cake',
    description: 'Rich and moist chocolate cake with ganache',
    cuisine: 'Dessert',
    ingredients: 'flour\nsugar\nbutter\nchocolate\neggs',
  };

  try {
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await resp.json();
    console.log('Response status:', resp.status);
    console.log(JSON.stringify(data, null, 2));

    // Extract images from known shapes: { success, data: { images: [...] } } or { images: [...] }
    const images = (data && data.data && Array.isArray(data.data.images)) ? data.data.images : (Array.isArray(data && data.images) ? data.images : []);
    if (images.length === 0) {
      console.log('No images found in response to perform HEAD checks.');
      return;
    }

    console.log(`Performing HEAD checks for ${images.length} image(s)...`);

    const head = async (url) => {
      if (!url || typeof url !== 'string') return { url, ok: false, status: null, error: 'invalid url' };
      if (url.startsWith('data:')) return { url, ok: true, status: 200, dataUri: true };
      try {
        // Try HEAD first
        let r = await fetchFunc(url, { method: 'HEAD' });
        if (!r.ok) {
          // Some hosts disallow HEAD; try GET with range request for minimal data
          r = await fetchFunc(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
        }
        const contentType = r.headers && (r.headers.get ? r.headers.get('content-type') : r.headers['content-type']) || null;
        const contentLength = r.headers && (r.headers.get ? r.headers.get('content-length') : r.headers['content-length']) || null;
        return { url, ok: r.ok, status: r.status, contentType, contentLength };
      } catch (err) {
        return { url, ok: false, status: null, error: String(err) };
      }
    };

    const checks = await Promise.all(images.map(img => head((img && img.url) || img)));
    console.log('HEAD check results:');
    checks.forEach(c => console.log(JSON.stringify(c, null, 2)));
  } catch (err) {
    console.error('Test call failed:', err);
    process.exit(1);
  }
}

main();
