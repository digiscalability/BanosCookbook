/**
 * Firestore security rules tests. Runs against the local emulator only:
 *   npm run test:rules
 * (wraps `firebase emulators:exec --only firestore --project demo-banos ...`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-banos';
let env: RulesTestEnvironment;

const guest = () => env.unauthenticatedContext().firestore();
const user = (uid = 'alice') => env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore();
const admin = () => env.authenticatedContext('abbas', { admin: true }).firestore();

const content = { title: 'Aloo Gosht', ingredients: ['mutton', 'potatoes'], instructions: ['cook'] };

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env?.cleanup();
});

describe('recipes: create', () => {
  it('denies guest create', async () => {
    await assertFails(setDoc(doc(guest(), 'recipes/r1'), { ...content, imageUrl: 'https://x/y.jpg' }));
  });

  it('allows a signed-in user to create plain content they own', async () => {
    await assertSucceeds(setDoc(doc(user(), 'recipes/r1'), { ...content, userId: 'alice' }));
  });

  it('denies creating a recipe owned by someone else', async () => {
    await assertFails(setDoc(doc(user(), 'recipes/r1'), { ...content, userId: 'bob' }));
  });

  it.each([
    ['source', 'ammi_book'],
    ['status', 'published'],
    ['sourceBook', 'monasal-bana'],
    ['sourcePage', 12],
    ['scanPath', 'book/monasal-bana/p012.jpg'],
    ['scanUrl', 'https://firebasestorage.googleapis.com/x'],
    ['social', { eligible: true }],
    ['rating', 5],
    ['ratingCount', 100],
    ['instagramPostId', '123'],
    ['instagramPermalink', 'https://instagram.com/p/x'],
    ['savedBy', ['alice']],
  ])('denies a client setting %s on create', async (field, value) => {
    await assertFails(
      setDoc(doc(user(), 'recipes/r1'), { ...content, userId: 'alice', [field]: value })
    );
  });
});

describe('recipes: update', () => {
  beforeEach(async () => {
    await seed('recipes/mine', { ...content, userId: 'alice', source: 'community', status: 'draft' });
  });

  it('allows the owner to edit content fields', async () => {
    await assertSucceeds(updateDoc(doc(user(), 'recipes/mine'), { title: 'Aloo Gosht (Ammi)' }));
  });

  it.each([
    ['source', 'ammi_book'],
    ['status', 'published'],
    ['social', { eligible: true }],
    ['rating', 5],
    ['userId', 'bob'],
  ])('denies the owner changing %s', async (field, value) => {
    await assertFails(updateDoc(doc(user(), 'recipes/mine'), { [field]: value }));
  });

  it('denies a non-owner edit', async () => {
    await assertFails(updateDoc(doc(user('bob'), 'recipes/mine'), { title: 'Hijacked' }));
  });

  it('allows an admin to publish', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'recipes/mine'), { status: 'published' }));
  });
});

describe('recipes: visibility', () => {
  beforeEach(async () => {
    await seed('recipes/pub', { ...content, source: 'ammi_book', status: 'published' });
    await seed('recipes/hidden', { ...content, source: 'sample', status: 'hidden' });
    await seed('recipes/legacy', { ...content });
  });

  it('lets anyone read a published recipe', async () => {
    await assertSucceeds(getDoc(doc(guest(), 'recipes/pub')));
  });

  it('hides a hidden recipe from guests and other users', async () => {
    await assertFails(getDoc(doc(guest(), 'recipes/hidden')));
    await assertFails(getDoc(doc(user('bob'), 'recipes/hidden')));
  });

  it('hides a recipe with no status (pre-migration) from guests', async () => {
    await assertFails(getDoc(doc(guest(), 'recipes/legacy')));
  });

  it('lets an admin read hidden recipes', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'recipes/hidden')));
  });
});

describe('recipes: delete', () => {
  beforeEach(async () => {
    await seed('recipes/ammi', { ...content, userId: 'alice', source: 'ammi_book', status: 'published' });
    await seed('recipes/mine', { ...content, userId: 'alice', source: 'community', status: 'draft' });
  });

  it('denies guests and non-owners', async () => {
    await assertFails(deleteDoc(doc(guest(), 'recipes/mine')));
    await assertFails(deleteDoc(doc(user('bob'), 'recipes/mine')));
  });

  it("never lets a non-admin delete one of Ammi's recipes", async () => {
    await assertFails(deleteDoc(doc(user(), 'recipes/ammi')));
  });

  it('allows the owner to delete their own submission', async () => {
    await assertSucceeds(deleteDoc(doc(user(), 'recipes/mine')));
  });
});

describe('users: no self-promotion', () => {
  beforeEach(async () => {
    await seed('users/alice', { username: 'alice', displayName: 'Alice', email: 'alice@example.com' });
  });

  it('allows editing own profile fields', async () => {
    await assertSucceeds(updateDoc(doc(user(), 'users/alice'), { bio: 'I cook' }));
  });

  it.each([
    ['admin', true],
    ['role', 'admin'],
    ['isAdmin', true],
    ['tier', 'pro'],
    ['credits', 9999],
    ['plan', 'pro'],
  ])('denies a user setting %s on their own profile', async (field, value) => {
    await assertFails(updateDoc(doc(user(), 'users/alice'), { [field]: value }));
  });

  it('denies creating a profile that carries a role', async () => {
    await assertFails(
      setDoc(doc(user('carol'), 'users/carol'), { username: 'carol', role: 'admin' })
    );
  });

  it("denies reading someone else's profile", async () => {
    await assertFails(getDoc(doc(user('bob'), 'users/alice')));
  });
});

describe('user_credits: server-only', () => {
  beforeEach(async () => {
    await seed('user_credits/alice', { tier: 'free', videosThisMonth: 0 });
  });

  it('lets a user read their own credits', async () => {
    await assertSucceeds(getDoc(doc(user(), 'user_credits/alice')));
  });

  it("denies reading someone else's credits", async () => {
    await assertFails(getDoc(doc(user('bob'), 'user_credits/alice')));
  });

  it('denies all client writes, including by the owner and an admin', async () => {
    await assertFails(updateDoc(doc(user(), 'user_credits/alice'), { tier: 'pro' }));
    await assertFails(setDoc(doc(user('bob'), 'user_credits/bob'), { tier: 'pro' }));
    await assertFails(updateDoc(doc(admin(), 'user_credits/alice'), { videosThisMonth: 0 }));
  });
});

describe('instagram_tokens: never client-readable', () => {
  beforeEach(async () => {
    await seed('instagram_tokens/main', { accessToken: 'secret' });
  });

  it('denies guests, users and admins', async () => {
    await assertFails(getDoc(doc(guest(), 'instagram_tokens/main')));
    await assertFails(getDoc(doc(user(), 'instagram_tokens/main')));
    await assertFails(getDoc(doc(admin(), 'instagram_tokens/main')));
    await assertFails(setDoc(doc(admin(), 'instagram_tokens/main'), { accessToken: 'x' }));
  });
});

describe('book_pages: admin read, server-only writes', () => {
  beforeEach(async () => {
    await seed('book_pages/monasal-bana_p001', { page: 1, storagePath: 'book/monasal-bana/p001.jpg' });
  });

  it('lets an admin read and nobody write', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'book_pages/monasal-bana_p001')));
    await assertFails(getDoc(doc(user(), 'book_pages/monasal-bana_p001')));
    await assertFails(setDoc(doc(admin(), 'book_pages/monasal-bana_p002'), { page: 2 }));
  });
});

describe('everything else is closed by default', () => {
  it('denies unknown collections', async () => {
    await assertFails(setDoc(doc(user(), 'split_scenes/r1'), { x: 1 }));
    await assertFails(getDoc(doc(guest(), 'upload_rate_limits/1.2.3.4')));
  });
});
