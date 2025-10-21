require('dotenv').config();

const API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';

async function testGemini() {
  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=' + API_KEY;
  const body = {
    contents: [{
      parts: [{
        text: `You are a creative short-form video scripter for Instagram and TikTok Reels. Given a recipe, write a catchy, trendy, audience-boosting video script for a 30-60 second video. Include hooks, calls to action, and highlight what makes the recipe unique. Suggest 2-3 marketing ideas or trends to boost engagement. Format the script for easy reading by a video editor or AI video generator.\n\nRecipe Title: Chocolate Cake\nDescription: A rich, moist chocolate cake perfect for celebrations.\nCuisine: Dessert\nIngredients: flour, sugar, cocoa powder, eggs, butter, baking powder, milk\nInstructions: Mix dry ingredients. Add wet ingredients. Bake at 350F for 30 minutes. Cool and frost.`
      }]
    }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log('Gemini API response:', JSON.stringify(data, null, 2));
}

testGemini();
