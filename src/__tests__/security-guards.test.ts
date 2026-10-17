import crypto from 'crypto';

import { describe, expect, it, vi } from 'vitest';

import { isAdminClaims } from '@/server/auth/require-admin';
import { verifyMetaSignature } from '@/server/instagram/verify-signature';
import { assertPublicHttpsUrl, isPrivateAddress } from '@/server/net/ssrf-guard';
import { pickRecipeFields } from '@/server/recipes/recipe-fields';

describe('isAdminClaims', () => {
  it('is true only for admin === true', () => {
    expect(isAdminClaims({ admin: true })).toBe(true);
    expect(isAdminClaims({ admin: 'true' })).toBe(false);
    expect(isAdminClaims({ role: 'admin' })).toBe(false);
    expect(isAdminClaims(null)).toBe(false);
  });
});

describe('requireAdminAction', () => {
  it('rejects with 401 when there is no session cookie', async () => {
    vi.doMock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
    const { requireAdminAction } = await import('@/server/auth/require-admin');
    await expect(requireAdminAction()).rejects.toMatchObject({ name: 'AuthError', status: 401 });
    vi.doUnmock('next/headers');
  });
});

describe('verifyMetaSignature', () => {
  const secret = 'app-secret';
  const body = Buffer.from('{"entry":[]}');
  const good = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a correct signature', () => {
    expect(verifyMetaSignature(body, good, secret)).toBe(true);
  });

  it('rejects a missing, malformed, sha1 or wrong signature', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=', secret)).toBe(false);
    expect(verifyMetaSignature(body, 'sha1=' + 'a'.repeat(40), secret)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=' + 'a'.repeat(64), secret)).toBe(false);
    expect(verifyMetaSignature(Buffer.from('tampered'), good, secret)).toBe(false);
  });
});

describe('SSRF guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:a9fe:a9fe',
  ])('treats %s as private', ip => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '142.250.70.78', '2606:4700:4700::1111'])('treats %s as public', ip => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it.each([
    'http://example.com/a.jpg',
    'ftp://example.com/a.jpg',
    'https://user:pw@example.com/',
    'https://example.com:8443/',
    'https://localhost/',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/',
    'not a url',
  ])('rejects %s', async url => {
    await expect(assertPublicHttpsUrl(url)).rejects.toMatchObject({ name: 'UnsafeUrlError' });
  });

  it('enforces the host allowlist by exact host or subdomain, not suffix', async () => {
    await expect(
      assertPublicHttpsUrl('https://evilpicsum.photos/x', { allowHosts: ['picsum.photos'] })
    ).rejects.toMatchObject({ name: 'UnsafeUrlError' });
  });

  it('accepts a public IP literal over https', async () => {
    await expect(assertPublicHttpsUrl('https://8.8.8.8/')).resolves.toBeInstanceOf(URL);
  });
});

describe('pickRecipeFields', () => {
  const base = { title: 'Aloo Gosht', ingredients: ['a'], instructions: ['b'] };

  it('drops server-only fields for non-admins', () => {
    const res = pickRecipeFields(
      { ...base, source: 'ammi_book', status: 'published', rating: 5, social: { eligible: true }, postToInstagram: true },
      { admin: false }
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(Object.keys(res.data).sort()).toEqual(['ingredients', 'instructions', 'title']);
    }
  });

  it('lets admins set source and status, validating values', () => {
    const ok = pickRecipeFields({ ...base, source: 'ammi_book', status: 'published' }, { admin: true });
    expect(ok.ok && ok.data.status).toBe('published');
    const bad = pickRecipeFields({ ...base, status: 'live' }, { admin: true });
    expect(bad.ok).toBe(false);
  });

  it('splits newline text into lists', () => {
    const res = pickRecipeFields({ ...base, ingredients: 'one\n two \n\nthree' }, { admin: false });
    expect(res.ok && res.data.ingredients).toEqual(['one', 'two', 'three']);
  });
});
