'use server';

/**
 * @fileOverview Genkit flow that generates reply suggestions for recipe comments.
 *
 * - commentReplySuggestion - The exported flow function
 * - CommentReplySuggestionInput - Input type
 * - CommentReplySuggestionOutput - Output type
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';

const CommentReplySuggestionInputSchema = z.object({
  recipeTitle: z.string().describe('The title of the recipe being commented on.'),
  recipeDescription: z.string().describe('A brief description of the recipe.'),
  comment: z.string().describe('The comment from a reader that needs a reply.'),
});
export type CommentReplySuggestionInput = z.infer<typeof CommentReplySuggestionInputSchema>;

const CommentReplySuggestionOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('3 suggested reply messages for the food creator to use.'),
});
export type CommentReplySuggestionOutput = z.infer<typeof CommentReplySuggestionOutputSchema>;

export async function commentReplySuggestion(
  input: CommentReplySuggestionInput
): Promise<CommentReplySuggestionOutput> {
  return commentReplySuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'commentReplySuggestionPrompt',
  input: { schema: CommentReplySuggestionInputSchema },
  output: { schema: CommentReplySuggestionOutputSchema },
  prompt: `You are a friendly food creator managing your recipe cookbook. You need to reply to a comment on one of your recipes.

Recipe: {{{recipeTitle}}}
Description: {{{recipeDescription}}}

Comment from a reader:
"{{{comment}}}"

Generate exactly 3 different reply suggestions. Each reply should be:
- Warm, friendly, and authentic — like a real food creator talking to their community
- Relevant to the specific comment content
- Appropriately concise (1-3 sentences each)
- Varied in tone (e.g., enthusiastic, helpful, grateful)
- Written in first person as the recipe creator

Return exactly 3 suggestions in the suggestions array.`,
});

const commentReplySuggestionFlow = ai.defineFlow(
  {
    name: 'commentReplySuggestionFlow',
    inputSchema: CommentReplySuggestionInputSchema,
    outputSchema: CommentReplySuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate comment reply suggestions');
    }
    return output;
  }
);
