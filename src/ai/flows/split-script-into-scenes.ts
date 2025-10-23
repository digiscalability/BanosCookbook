import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const SplitScriptInputSchema = z.object({
  script: z.string(),
  sceneCount: z.number().min(2).max(10).default(3),
});

const SplitScriptOutputSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      script: z.string(),
      description: z.string().optional(),
      suggestedPrompt: z.string().optional(),
    })
  ),
});

export type SplitScriptInput = z.infer<typeof SplitScriptInputSchema>;
export type SplitScriptOutput = z.infer<typeof SplitScriptOutputSchema>;

const SPLIT_SCRIPT_PROMPT = `You are a video editor. Split this recipe script into {sceneCount} scenes. Avoid generic intros/outros. Each scene: logical segment (prep, cook, plate, serve) with complete steps. Return JSON: [{sceneNumber, script, description}].`;

export const splitScriptIntoScenesFlow = ai.defineFlow(
  {
    name: 'splitScriptIntoScenesFlow',
    inputSchema: SplitScriptInputSchema,
    outputSchema: SplitScriptOutputSchema,
  },
  async input => {
    const { script, sceneCount } = input;
    const userPrompt = `Script to split:\n${script}\n\nDivide into ${sceneCount} scenes.`;
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      prompt: `${SPLIT_SCRIPT_PROMPT}\n\n${userPrompt}`,
      config: { temperature: 0.5, maxOutputTokens: 1200 },
    });
    try {
      const parsed = JSON.parse(result.text);
      return { scenes: parsed };
    } catch {
      // Fallback: improved split by treating bracketed tokens (e.g. [INTRO], [SCENE 1])
      // as hard separators so the UI doesn't cram multiple labeled sections into one scene.
      // First, try an intelligent bracket-aware split. If that produces too few segments,
      // fall back to paragraph and line splitting.
      const bracketSplits = script
        .split(/(?=\[[A-Za-z0-9 _\-]{2,}[:\]]+)/)
        .map(s => s.trim())
        .filter(Boolean);
      let paragraphs =
        bracketSplits.length >= 2
          ? bracketSplits
          : script
              .split(/\n\n+/)
              .map(p => p.trim())
              .filter(Boolean);
      // Remove generic intro/outro if present
      if (paragraphs.length > 2) {
        // Remove intro if it contains common intro phrases
        const introRegex =
          /welcome|let'?s get started|today we'?re|in this video|introduction|hi,? i'?m|hello/i;
        if (introRegex.test(paragraphs[0])) paragraphs = paragraphs.slice(1);
        // Remove outro if it contains common outro phrases
        const outroRegex =
          /enjoy|thanks for watching|that'?s it|bon appétit|see you next time|hope you enjoy/i;
        if (outroRegex.test(paragraphs[paragraphs.length - 1]))
          paragraphs = paragraphs.slice(0, -1);
      }
      // If still too few, fallback to splitting by lines
      if (paragraphs.length < sceneCount) {
        // Try line-based split as last resort
        paragraphs = script
          .split(/\n+/)
          .map(p => p.trim())
          .filter(Boolean);
      }
      const chunkSize = Math.ceil(paragraphs.length / sceneCount);
      const scenes = Array.from({ length: sceneCount }, (_, i) => {
        const scriptText = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize).join('\n\n');
        // Create a short suggested prompt from the scene script
        const suggestedPrompt = scriptText.split('\n').slice(0, 3).join(' ').slice(0, 400).trim();
        return {
          sceneNumber: i + 1,
          script: scriptText,
          description: `Scene ${i + 1}`,
          suggestedPrompt,
        };
      });
      return { scenes };
    }
  }
);
