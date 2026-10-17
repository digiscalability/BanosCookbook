import { describe, expect, it, vi } from 'vitest';

import { splitScriptIntoScenesFlow } from '@/ai/flows/split-script-into-scenes';

describe('split-script fallback', () => {
  it('splits a simple script into requested number of scenes using fallback', async () => {
    const script = `Welcome to my kitchen.\n\nChop the onions.\n\nSauté onions until golden.\n\nAdd tomatoes and simmer.\n\nServe and enjoy.`;
    const res = await splitScriptIntoScenesFlow({ script, sceneCount: 3 });
    expect(res).toHaveProperty('scenes');
    expect(res.scenes.length).toBe(3);
    expect(res.scenes[0].script).toBeTruthy();
    expect(res.scenes[0].suggestedPrompt).toBeTruthy();
  });
});

describe('getSceneHistoryAction auth', () => {
  it('rejects callers without an admin session', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: () => undefined }),
    }));
    const { getSceneHistoryAction } = await import('@/app/actions');
    await expect(getSceneHistoryAction('nonexistent_recipe', 1)).rejects.toMatchObject({
      name: 'AuthError',
      status: 401,
    });
    vi.doUnmock('next/headers');
  });
});
