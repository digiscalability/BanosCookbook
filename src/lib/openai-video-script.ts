import OpenAI from 'openai';

export interface OpenAIVideoScriptResult {
  script: string;
  marketingIdeas: string[];
}

export async function generateVideoScriptWithOpenAI(input: {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
}): Promise<OpenAIVideoScriptResult> {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) throw new Error('No OpenAI API key configured');
  const openai = new OpenAI({ apiKey: API_KEY });
  const prompt = `You are a creative short-form video scripter for Instagram and TikTok Reels. Given a recipe, write a catchy, trendy, audience-boosting video script for a 30-60 second video. Include hooks, calls to action, and highlight what makes the recipe unique. Suggest 2-3 marketing ideas or trends to boost engagement. Format the script for easy reading by a video editor or AI video generator.\n\nRecipe Title: ${input.title}\nDescription: ${input.description}\nCuisine: ${input.cuisine}\nIngredients: ${input.ingredients.join(', ')}\nInstructions: ${input.instructions.join(' ')}\n`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 800,
    temperature: 0.8,
  });
  const script = response.choices[0].message?.content || '';
  let marketingIdeas: string[] = [];
  if (script) {
    const match = script.match(/Marketing Ideas?:\s*([\s\S]*)/i);
    if (match) {
      marketingIdeas = match[1]
        .split(/\n|\*/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      marketingIdeas = marketingIdeas.filter(idea => idea.length > 3);
    }
  }
  return { script, marketingIdeas };
}
