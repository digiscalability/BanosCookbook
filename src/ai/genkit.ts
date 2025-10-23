import { googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey:
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_GENAI_API_KEY ||
        process.env.GEMINI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-pro',
});
