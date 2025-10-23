export interface GeminiVideoScriptResult {
  script: string;
  marketingIdeas: string[];
}

export async function generateVideoScriptWithGemini(input: {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
}): Promise<GeminiVideoScriptResult> {
  const API_KEY =
    process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error('No Gemini API key configured');
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;
  const prompt = `You are a creative short-form video scripter for Instagram and TikTok Reels. Given a recipe, write a catchy, trendy, audience-boosting video script for a 30-60 second video. Include hooks, calls to action, and highlight what makes the recipe unique. Suggest 2-3 marketing ideas or trends to boost engagement. Format the script for easy reading by a video editor or AI video generator.\n\nRecipe Title: ${input.title}\nDescription: ${input.description}\nCuisine: ${input.cuisine}\nIngredients: ${input.ingredients.join(', ')}\nInstructions: ${input.instructions.join(' ')}\n`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  // Use dynamic import for node-fetch for compatibility in scripts and server actions
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  let script = '';
  if (data && Array.isArray(data.candidates) && data.candidates[0]?.content?.parts?.[0]?.text) {
    script = data.candidates[0].content.parts[0].text;
  }
  // Try to extract marketing ideas if present (optional, fallback to empty array)
  let marketingIdeas: string[] = [];
  if (script) {
    const match = script.match(/Marketing Ideas?:\s*([\s\S]*)/i);
    if (match) {
      // Try to split by lines or bullets
      marketingIdeas = match[1]
        .split(/\n|\*/)
        .map(s => s.trim())
        .filter(Boolean);
      // Remove any lines that are not actual ideas
      marketingIdeas = marketingIdeas.filter(idea => idea.length > 3);
    }
  }
  return { script, marketingIdeas };
}
