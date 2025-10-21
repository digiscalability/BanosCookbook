# Quick Integration Guide for Optimized AI Prompts

This guide shows you exactly how to integrate the optimized AI prompt system into your existing `actions.ts` file.

---

## Step 1: Update Imports

Add these imports to `src/app/actions.ts`:

```typescript
// Optimized AI flows
import { generateVideoScriptOptimizedFlow } from '@/ai/flows/generate-video-script-optimized';
import { splitScriptIntoScenesOptimizedFlow } from '@/ai/flows/split-script-into-scenes-optimized';
import { generateOptimizedVideoScriptWithOpenAI } from '@/lib/openai-video-script-optimized';
import {
  buildRunwayPromptWithContinuity,
  extractVisualContinuity,
  validateRunwayPrompt
} from '@/lib/runway-prompt-optimizer';
```

---

## Step 2: Replace Video Script Generation

### Old Code:
```typescript
export async function generateVideoScriptAction(input: {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
}) {
  try {
    const { script, marketingIdeas } = await generateVideoScriptWithOpenAI(input);
    return { success: true, script, marketingIdeas };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

### New Code (Option A - Gemini with Structured Output):
```typescript
export async function generateVideoScriptAction(input: {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
  targetDuration?: number; // New: optional duration in seconds
  style?: 'trendy' | 'professional' | 'casual' | 'educational'; // New: optional style
}) {
  try {
    // Use optimized Gemini flow with structured output
    const result = await generateVideoScriptOptimizedFlow({
      ...input,
      targetDuration: input.targetDuration || 45,
      style: input.style || 'trendy',
    });

    return {
      success: true,
      concept: result.concept,
      hook: result.hook,
      scenes: result.scenes,
      musicSuggestion: result.musicSuggestion,
      marketingIdeas: result.marketingIdeas,
      totalDuration: result.totalDuration,
      runwayPromptHints: result.runwayPromptHints,
    };
  } catch (error) {
    console.error('Optimized script generation failed:', error);
    return { success: false, error: String(error) };
  }
}
```

### New Code (Option B - OpenAI with Structured Output):
```typescript
export async function generateVideoScriptAction(input: {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
  targetDuration?: number;
  style?: 'trendy' | 'professional' | 'casual' | 'educational';
}) {
  try {
    // Use OpenAI optimized version
    const result = await generateOptimizedVideoScriptWithOpenAI({
      ...input,
      targetDuration: input.targetDuration || 45,
      style: input.style || 'trendy',
    });

    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Optimized script generation failed:', error);
    return { success: false, error: String(error) };
  }
}
```

---

## Step 3: Update Scene Splitting

### Old Code:
```typescript
export async function splitScriptIntoScenesAction(
  script: string,
  sceneCount: number = 3
) {
  try {
    const { scenes } = await splitScriptIntoScenesFlow({ script, sceneCount });
    return { success: true, scenes };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

### New Code:
```typescript
export async function splitScriptIntoScenesAction(
  script: string,
  sceneCount: number = 3,
  visualContext?: {
    recipeTitle: string;
    keyIngredients?: string[];
    cookingTechniques?: string[];
  }
) {
  try {
    // Use optimized semantic splitting with continuity tracking
    const result = await splitScriptIntoScenesOptimizedFlow({
      script,
      sceneCount,
      visualContext
    });

    return {
      success: true,
      scenes: result.scenes,
      overallStyle: result.overallStyle,
      continuityGuidelines: result.continuityGuidelines,
    };
  } catch (error) {
    console.error('Optimized scene splitting failed:', error);
    return { success: false, error: String(error) };
  }
}
```

---

## Step 4: Update Multi-Scene Video Generation

The `generateMultiSceneVideo` function in `openai-video-gen.ts` is already optimized!

But you may want to update how you prepare the scenes before calling it:

### Enhanced Scene Preparation:

```typescript
export async function generateMultiSceneVideoAction(
  recipeId: string,
  recipeImageUrl: string,
  sceneData: {
    scenes: Array<{
      sceneNumber: number;
      script: string;
      description?: string;
      visualElements?: string[];
      cameraWork?: string;
      lighting?: string;
      duration?: number;
      transition?: string;
    }>;
  },
  model: RunwayModel = 'gen4_turbo',
) {
  try {
    const db = getDb();
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    const recipe = recipeDoc.data();

    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    // Import the optimized multi-scene generator (already updated)
    const { generateMultiSceneVideo } = await import('@/lib/openai-video-gen');

    // Generate videos with automatic continuity tracking
    const result = await generateMultiSceneVideo(
      recipeImageUrl,
      recipe.title,
      sceneData,
      model,
      { duration: 5, ratio: '1280:720' }
    );

    // Save to Firestore
    await db.collection('video_generation_assets').add({
      recipeId,
      sceneVideos: result.sceneVideos,
      combinedInstructions: result.combinedInstructions,
      generatedAt: new Date(),
      model,
    });

    return {
      success: true,
      sceneVideos: result.sceneVideos,
      combinedInstructions: result.combinedInstructions,
    };
  } catch (error) {
    console.error('Multi-scene video generation failed:', error);
    return { success: false, error: String(error) };
  }
}
```

---

## Step 5: Add Prompt Validation (Optional but Recommended)

Add a helper to validate Runway prompts before sending to API:

```typescript
export async function validateRunwayPromptAction(prompt: string) {
  const { validateRunwayPrompt } = await import('@/lib/runway-prompt-optimizer');
  const validation = validateRunwayPrompt(prompt);

  return {
    success: true,
    valid: validation.valid,
    score: validation.score,
    warnings: validation.warnings,
  };
}
```

Use it to check prompt quality:

```typescript
const validation = await validateRunwayPromptAction(prompt);
if (validation.score < 70) {
  console.warn('⚠️ Prompt quality low:', validation.warnings);
}
```

---

## Complete Example: End-to-End Video Generation

Here's a complete example showing the full workflow:

```typescript
/**
 * Complete workflow: Generate script → Split scenes → Generate videos
 */
export async function generateCompleteRecipeVideoAction(
  recipeId: string,
  options?: {
    targetDuration?: number;
    style?: 'trendy' | 'professional' | 'casual' | 'educational';
    sceneCount?: number;
    model?: RunwayModel;
  }
) {
  try {
    const db = getDb();
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    const recipe = recipeDoc.data();

    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    // Step 1: Generate optimized video script
    console.log('🎬 Step 1: Generating optimized video script...');
    const scriptResult = await generateVideoScriptOptimizedFlow({
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      cuisine: recipe.cuisine || 'Various',
      targetDuration: options?.targetDuration || 45,
      style: options?.style || 'trendy',
    });

    console.log(`✅ Generated script with ${scriptResult.scenes.length} scenes`);
    console.log(`🎵 Music suggestion: ${scriptResult.musicSuggestion}`);
    console.log(`💡 Marketing ideas:`, scriptResult.marketingIdeas);

    // Step 2: Use the scenes from structured output (already optimized!)
    const scenesForRunway = scriptResult.scenes.map(scene => ({
      sceneNumber: scene.sceneNumber,
      script: scene.visualBeats.map(b => b.narration).join(' '),
      description: scene.description,
      visualElements: scene.visualElements,
      cameraWork: scene.cameraWork,
      lighting: scene.lighting,
      duration: scene.duration,
      transition: scene.transition,
    }));

    // Step 3: Generate videos with Runway ML (with automatic continuity)
    console.log('🎥 Step 3: Generating scene videos with Runway ML...');
    const { generateMultiSceneVideo } = await import('@/lib/openai-video-gen');

    const videoResult = await generateMultiSceneVideo(
      recipe.imageUrl || '',
      recipe.title,
      { scenes: scenesForRunway },
      options?.model || 'gen4_turbo',
      { duration: 5, ratio: '1280:720' }
    );

    console.log(`✅ Generated ${videoResult.sceneVideos.length} scene videos`);

    // Step 4: Save everything to Firestore
    const videoAsset = await db.collection('video_generation_assets').add({
      recipeId,
      script: scriptResult,
      sceneVideos: videoResult.sceneVideos,
      combinedInstructions: videoResult.combinedInstructions,
      generatedAt: new Date(),
      model: options?.model || 'gen4_turbo',
      metadata: {
        style: options?.style || 'trendy',
        targetDuration: options?.targetDuration || 45,
        actualDuration: scriptResult.totalDuration,
      }
    });

    console.log(`💾 Saved to Firestore: ${videoAsset.id}`);

    return {
      success: true,
      assetId: videoAsset.id,
      concept: scriptResult.concept,
      hook: scriptResult.hook,
      totalDuration: scriptResult.totalDuration,
      sceneVideos: videoResult.sceneVideos,
      combinedInstructions: videoResult.combinedInstructions,
      marketingIdeas: scriptResult.marketingIdeas,
      musicSuggestion: scriptResult.musicSuggestion,
    };

  } catch (error) {
    console.error('❌ Complete video generation failed:', error);
    return { success: false, error: String(error) };
  }
}
```

---

## Usage in UI Components

### In Video Hub or Recipe Detail Page:

```typescript
'use client';
import { useState } from 'react';
import { generateCompleteRecipeVideoAction } from '@/app/actions';

export function VideoGenerationButton({ recipeId }: { recipeId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateCompleteRecipeVideoAction(recipeId, {
        targetDuration: 45,
        style: 'trendy',
        model: 'gen4_turbo',
      });

      if (result.success) {
        setResult(result);
        console.log('✅ Video generated!', result);
      } else {
        console.error('❌ Generation failed:', result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Optimized Video'}
      </button>

      {result && (
        <div className="mt-4">
          <h3>✅ Video Generated!</h3>
          <p><strong>Concept:</strong> {result.concept}</p>
          <p><strong>Hook:</strong> {result.hook}</p>
          <p><strong>Duration:</strong> {result.totalDuration}s</p>

          <h4>Scenes:</h4>
          {result.sceneVideos.map((scene: any) => (
            <div key={scene.sceneNumber}>
              <p>Scene {scene.sceneNumber}: <a href={scene.videoUrl}>Watch</a></p>
            </div>
          ))}

          <h4>Marketing Ideas:</h4>
          <ul>
            {result.marketingIdeas.map((idea: string, i: number) => (
              <li key={i}>{idea}</li>
            ))}
          </ul>

          <h4>Music:</h4>
          <p>{result.musicSuggestion}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Environment Variables

Ensure these are set in `.env.local`:

```bash
# AI Services (at least one required)
GOOGLE_API_KEY=...               # For Gemini flows
OPENAI_API_KEY=...               # For OpenAI flows

# Runway ML
RUNWAYML_API_SECRET=...          # For video generation
RUNWAY_API_KEY=...               # Alternative name (if RUNWAYML_API_SECRET not set)

# Optional: Feature flags
USE_OPTIMIZED_PROMPTS=true       # Toggle optimized system on/off
```

---

## Testing

### Test Script Generation:
```bash
npm run dev
# In browser console:
const result = await fetch('/api/test-optimized-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Chocolate Lava Cake',
    description: 'Decadent molten chocolate dessert',
    ingredients: ['dark chocolate', 'butter', 'eggs', 'sugar', 'flour'],
    instructions: ['Melt chocolate', 'Mix ingredients', 'Bake 12 min', 'Serve warm'],
    cuisine: 'French Dessert',
  })
}).then(r => r.json());
console.log(result);
```

### Test Scene Splitting:
```bash
# In browser console:
const result = await fetch('/api/test-scene-split', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'Your video script here...',
    sceneCount: 3,
    visualContext: {
      recipeTitle: 'Chocolate Lava Cake',
      keyIngredients: ['chocolate', 'butter'],
    }
  })
}).then(r => r.json());
console.log(result);
```

---

## Rollback Plan

If you need to revert to the old system:

```typescript
// In actions.ts, switch imports back:
import { generateVideoScriptFlow } from '@/ai/flows/generate-video-script';
import { splitScriptIntoScenesFlow } from '@/ai/flows/split-script-into-scenes';
import { generateVideoScriptWithOpenAI } from '@/lib/openai-video-script';

// OR use a feature flag:
const USE_OPTIMIZED = process.env.USE_OPTIMIZED_PROMPTS === 'true';

const scriptResult = USE_OPTIMIZED
  ? await generateVideoScriptOptimizedFlow(input)
  : await generateVideoScriptFlow(input);
```

---

## Next Steps

1. ✅ Update `src/app/actions.ts` with the new imports and functions
2. ✅ Test with a few recipes to verify output quality
3. ✅ Deploy to staging environment
4. ✅ A/B test: Compare video quality between old and new systems
5. ✅ Monitor token usage and costs
6. ✅ Gradually roll out to production
7. ✅ Update UI to show new metadata (concept, hook, music, etc.)

---

**Questions?** Check the full documentation in `AI_PROMPT_OPTIMIZATION_SUMMARY.md`
