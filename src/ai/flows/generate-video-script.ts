import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const GenerateVideoScriptInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  cuisine: z.string().optional(),
});

const GenerateVideoScriptOutputSchema = z.object({
  script: z.string(),
  marketingIdeas: z.array(z.string()).optional(),
});

export type GenerateVideoScriptInput = z.infer<typeof GenerateVideoScriptInputSchema>;
export type GenerateVideoScriptOutput = z.infer<typeof GenerateVideoScriptOutputSchema>;

const SYSTEM_PROMPT = `You are a video script writer for Instagram/TikTok Reels. Write a 30-60 second script for this recipe: include a hook, key steps, and call-to-action. Highlight unique aspects. Suggest 2-3 marketing ideas.

**IMPORTANT FORMATTING RULES:**
- DO NOT use production markers like [INTRO], [SCENE 1], [OUTRO]
- DO NOT use labels like "On-Screen Text:", "Narrator:", "(Voiceover)"
- DO NOT number steps like "Step 1.", "Step 2."
- Write narration as DIRECT SPEECH - what the viewer hears
- Write clear, conversational sentences
- Separate different moments with blank lines

**Example of GOOD formatting:**
These 1981 peanut pastries are about to blow your mind.

Start with flour, sugar, and shortening in a bowl. Mix until crumbly.

Add milk and knead into a smooth dough.

Roll out, cut into shapes, and bake until golden.

Top with caramelized nuts and jam. Pure nostalgic perfection.

**Example of BAD formatting (DON'T DO THIS):**
[INTRO: Scene opens...]
On-Screen Text: "Lost Recipe"
Narrator (Voiceover): "These pastries..."
Step 1. Mix ingredients

Format clearly with blank lines between sections.`;

export const generateVideoScriptFlow = ai.defineFlow(
  {
    name: 'generateVideoScriptFlow',
    inputSchema: GenerateVideoScriptInputSchema,
    outputSchema: GenerateVideoScriptOutputSchema,
  },
  async input => {
    const { title, description, ingredients, instructions, cuisine } = input;
    const userPrompt = `Recipe Title: ${title}\nDescription: ${description}\nCuisine: ${cuisine || ''}\nIngredients: ${ingredients.join(', ')}\nInstructions: ${instructions.join(' ')}\n`;
    // IMPORTANT: Use 'googleai/gemini-2.5-pro' or 'googleai/gemini-2.5-flash' as the model name.
    // Your API key/project must have access to Gemini 2.5 Pro or Flash (see https://ai.google.dev/gemini-api/docs/models)
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 800,
      },
    });
    // Remove debug log in production. If script is empty, model/config is likely misconfigured.
    let script = result.text;

    // POST-PROCESSING: Clean any production cues that AI might still generate
    // Remove bracketed scene markers
    script = script.replace(/\[[A-Z][A-Za-z0-9 _\-:]*\]/g, '');
    // Remove "On-Screen Text:" and similar labels
    script = script.replace(
      /^(On[-\s]Screen\s+Text|Narrator|Voiceover|Voice\s+Over)\s*[:(]?[^:]*[:\)]?\s*/gim,
      ''
    );
    // Remove step numbering
    script = script.replace(/^(Step\s+)?\d+[.):]\s*/gim, '');
    // Remove parenthetical voiceover cues
    script = script.replace(/\([vV]oice[-\s]?over\)/g, '');
    script = script.replace(/\([nN]arrat(ion|or)\)/g, '');
    // Clean up excessive whitespace
    script = script.replace(/\n{3,}/g, '\n\n').trim();

    let marketingIdeas: string[] = [];
    // Only parse marketing ideas if the marker is present
    if (script.includes('Marketing Ideas:')) {
      const match = script.match(/Marketing Ideas:([\s\S]*)$/);
      if (match) {
        marketingIdeas = match[1]
          .split(/\n|\*/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        script = script.replace(/Marketing Ideas:([\s\S]*)$/, '').trim();
      }
    }
    // Always return the main script text, even if marketing ideas are not found
    return { script, marketingIdeas };
  }
);
