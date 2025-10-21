import { splitScriptIntoScenesFlow } from '@/ai/flows/split-script-into-scenes';
import { describe, expect, it } from 'vitest';

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

describe('getSceneHistoryAction smoke', () => {
  it('should be callable (admin DB not available in test env) and return a predictable structure', async () => {
    // Import lazily; this action uses admin DB so in test env it will likely return failure but shape should be respected
    const { getSceneHistoryAction } = await import('@/app/actions');
    const res = await getSceneHistoryAction('nonexistent_recipe', 1);
    expect(res).toHaveProperty('success');
    // success can be false in CI; ensure no exception thrown and keys present
    if (res.success) {
      expect(Array.isArray(res.history)).toBe(true);
    } else {
      expect(typeof res.error === 'string' || res.history === undefined).toBe(true);
    }
  });
});
