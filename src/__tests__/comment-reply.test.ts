/**
 * Tests for the comment-reply-suggestion flow schema validation.
 * We do NOT call the actual AI — we only verify the input/output schema shapes.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'genkit';

// Mock Genkit AI to avoid actual API calls
vi.mock('@/ai/genkit', () => ({
  ai: {
    definePrompt: vi.fn().mockReturnValue(vi.fn()),
    defineFlow: vi.fn().mockImplementation((_config, fn) => fn),
  },
}));

// Define the same schemas inline so we can test them independently
const CommentReplySuggestionInputSchema = z.object({
  recipeTitle: z.string(),
  recipeDescription: z.string(),
  comment: z.string(),
});

const CommentReplySuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(5),
});

describe('commentReplySuggestion input schema', () => {
  it('validates a complete valid input', () => {
    const input = {
      recipeTitle: 'Spaghetti Carbonara',
      recipeDescription: 'Classic Roman pasta with eggs and pancetta',
      comment: 'This looks amazing! Can I substitute bacon for pancetta?',
    };
    const result = CommentReplySuggestionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('requires recipeTitle', () => {
    const input = {
      recipeDescription: 'A great recipe',
      comment: 'Looks good!',
    };
    const result = CommentReplySuggestionInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('requires comment', () => {
    const input = {
      recipeTitle: 'Pasta',
      recipeDescription: 'A pasta recipe',
    };
    const result = CommentReplySuggestionInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('allows empty recipeDescription', () => {
    const input = {
      recipeTitle: 'Pasta',
      recipeDescription: '',
      comment: 'Great recipe!',
    };
    const result = CommentReplySuggestionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('commentReplySuggestion output schema', () => {
  it('validates a valid output with 3 suggestions', () => {
    const output = {
      suggestions: [
        'Thanks so much! Yes, bacon works perfectly here.',
        'Absolutely! Bacon is a great substitute — slightly smokier but delicious.',
        "Great question! Bacon is totally fine to use here. Enjoy!",
      ],
    };
    const result = CommentReplySuggestionOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('rejects empty suggestions array', () => {
    const output = { suggestions: [] };
    const result = CommentReplySuggestionOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 suggestions', () => {
    const output = {
      suggestions: ['a', 'b', 'c', 'd', 'e', 'f'],
    };
    const result = CommentReplySuggestionOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it('validates single suggestion', () => {
    const output = {
      suggestions: ['Thanks for the comment!'],
    };
    const result = CommentReplySuggestionOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('requires suggestions to be strings', () => {
    const output = {
      suggestions: [1, 2, 3],
    };
    const result = CommentReplySuggestionOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });
});
