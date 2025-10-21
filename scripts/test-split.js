const script = `[INTRO: Scene opens with a close-up shot of a vintage diary and the title of the recipe handwritten on a yellowed page.]

**On-Screen Text:** "Lost Recipe from 1981: Peanut Pastries 🍪✨"

**Narrator (Voiceover):** "Unlock a vintage treasure from 1981 with these irresistible Peanut Pastries! Ready to add a sweet twist to your dessert game?"

[SCENE 1: Quick montage of ingredients being laid out on a countertop.]

**On-Screen Text:** "Simple Ingredients, Vintage Vibes"

**Narrator (Voiceover):** "With just a few pantry staples, you can create magic! Let's dive in."

[SCENE 2: Fast cuts of mixing the dough and rolling it out.]

**On-Screen Text:** "Mix. Roll. Cut."

**Narrator (Voiceover):** "Mix flour, icing sugar, and shortening, sprinkle some milk, and knead away. Roll and cut into your favorite shapes."`;

function bracketSplit(s) {
  return s.split(/(?=\[[A-Za-z0-9 _\-]{2,}[:\]]+)/).map(x => x.trim()).filter(Boolean);
}

function paragraphSplit(s) {
  return s.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
}

console.log('=== Bracket split ===');
console.log(bracketSplit(script).map((p,i) => `--[${i+1}]--\n${p}\n`).join('\n'));

console.log('=== Paragraph split ===');
console.log(paragraphSplit(script).map((p,i) => `--[${i+1}]--\n${p}\n`).join('\n'));

// Example prompts for Peanut Pastries
console.log('\n=== Example Prompts ===');
const imagePrompt = `Close-up of a vintage handwritten recipe diary on a yellowed page, warm natural window light, shallow depth of field, soft vignette, peanut pastries on a small plate in the background, film grain, warm sepia tones, professional food photography, 4:3`;
const videoPrompt = `Recipe video: "Peanut Pastries". Intro close-up of vintage handwritten diary on yellowed page; camera dolly in slowly; warm natural lighting; cut to top-down montage of ingredients laid out on a countertop; close-ups of hands mixing dough, rolling, and cutting shapes; cinematic food photography, smooth camera movement, appetizing lighting, warm vintage color grading.`;
const voiceText = `Unlock a vintage treasure from 1981 with these irresistible Peanut Pastries! Ready to add a sweet twist to your dessert game?`;

console.log('Image Prompt:\n', imagePrompt);
console.log('\nVideo Prompt:\n', videoPrompt);
console.log('\nVoice Text:\n', voiceText);
