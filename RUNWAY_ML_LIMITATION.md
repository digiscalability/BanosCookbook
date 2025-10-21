# 🎥 Runway ML Limitation - Image-to-Video Only

**Date**: October 21, 2025
**Issue**: Videos are just animating the recipe reference image instead of generating scene-specific content
**Root Cause**: Runway ML SDK **ONLY supports image-to-video**, NOT text-to-video

---

## 🐛 **The Problem**

### What's Happening
Your Peanut Pastries scenes have prompts like:
- Scene 1: "In a bowl, combine the flour, icing sugar, and shortening..."
- Scene 2: "Bake in a preheated oven at 350°F for 25-30 minutes..."
- Scene 3: "Top with the caramelized nut mixture..."

But the generated videos show **the same beautiful pastry stack image** with slight animations (cream being poured), not the actual cooking actions described.

### Why It's Happening
From `src/lib/openai-video-gen.ts` line 125:
```typescript
const referenceImage = selectReferenceImage(scene, recipeImageUrl);

const task = await runwayClient.imageToVideo.create({
  model,
  promptImage: referenceImage, // Always the recipe image!
  promptText: prompt,
  ratio: options?.ratio || '1280:720',
  duration: scene.duration || 5,
});
```

**The code passes:**
1. **`promptImage`**: The final recipe image (peanut pastries on a plate)
2. **`promptText`**: "In a bowl, combine flour, sugar..." (mixing ingredients)

**Runway tries to animate the pastry image to match the text**, which is impossible! You can't make a finished pastry turn back into ingredients being mixed.

---

## 📚 **Runway ML SDK Documentation**

### Required Parameters
From Runway ML SDK Node.js documentation:

```typescript
await client.imageToVideo.create({
  model: 'gen4_turbo',
  promptImage: 'https://example.com/assets/bunny.jpg', // REQUIRED ⚠️
  ratio: '1280:720',
  promptText: 'The bunny is eating a carrot', // Optional enhancement
});
```

**Key Point**: `promptImage` is **REQUIRED**. Runway ML **does NOT support text-to-video generation**.

### How Image-to-Video Works
- Takes a **static image** as a starting point
- Animates elements **within that image** based on the prompt
- Example: Image of bunny → "bunny eating carrot" → bunny's mouth moves, carrot gets smaller
- **Cannot generate new scenes** from text alone

### Why Your Use Case Fails
- **Scene 1**: "Mix flour and sugar in bowl"
  - Input: Finished pastry image 🍰
  - Expected: Mixing ingredients 🥣
  - **Result**: Runway animates the pastry (maybe adds motion blur or zoom) ❌

- **Scene 2**: "Bake at 350°F"
  - Input: Finished pastry image 🍰
  - Expected: Oven with baking pastries 🔥
  - **Result**: Runway adds steam or lighting effects to pastry ❌

---

## 💡 **Solutions**

### **Option 1: Asset Library Integration** (RECOMMENDED ✅)

**Concept**: Match scene descriptions to pre-generated generic cooking videos from your Asset Library.

#### Implementation Plan

1. **Tag Assets with Categories**
   - Add `category` field to `VideoHubAsset` type
   - Categories: `mixing`, `baking`, `cutting`, `pouring`, `plating`, `closeup`, etc.

2. **Scene Matching Logic**
   - Extract cooking verbs from scene script (already done by `extractKeyActions()` in `text-pruning.ts`)
   - Match verbs to asset categories:
     ```typescript
     const actionMap = {
       mix: 'mixing',
       stir: 'mixing',
       combine: 'mixing',
       bake: 'baking',
       roast: 'baking',
       cook: 'cooking',
       cut: 'cutting',
       chop: 'cutting',
       slice: 'cutting',
       pour: 'pouring',
       drizzle: 'pouring',
     };
     ```

3. **Fallback Strategy**
   ```typescript
   async function selectVideoForScene(scene, assetLibrary, recipeImageUrl) {
     // 1. Extract cooking action from scene
     const actions = extractKeyActions(scene.script);

     // 2. Find matching asset video
     for (const action of actions) {
       const category = actionMap[action];
       const matchingAsset = assetLibrary.find(
         asset => asset.type === 'video' && asset.metadata?.category === category
       );
       if (matchingAsset) {
         return matchingAsset.url; // Use existing video!
       }
     }

     // 3. No match? Fall back to recipe image animation (current behavior)
     return generateRunwayVideo(scene, recipeImageUrl);
   }
   ```

#### Pros
- ✅ **Instant**: No generation time or cost for matching scenes
- ✅ **Consistent quality**: Use professionally shot/generated cooking videos
- ✅ **Scalable**: Reuse assets across all recipes
- ✅ **Cost-effective**: Only generate when no match exists

#### Cons
- ⚠️ Generic videos (not recipe-specific)
- ⚠️ Requires building/sourcing asset library upfront
- ⚠️ May not have perfect match for every scene

#### Assets Needed
Start with these 10-15 generic cooking video categories:
1. **mixing** - Whisking in bowl, stirring batter
2. **baking** - Oven with steam, golden crust forming
3. **cutting** - Chopping on cutting board
4. **pouring** - Liquid being poured into container
5. **kneading** - Hands working dough
6. **rolling** - Rolling pin flattening dough
7. **measuring** - Measuring cups/spoons
8. **sifting** - Flour through sifter
9. **heating** - Stovetop with pan
10. **plating** - Arranging food on plate
11. **garnishing** - Adding herbs/toppings
12. **cooling** - Steam rising from baked goods
13. **spreading** - Spreading jam/frosting
14. **closeup** - Ingredient close-ups

---

### **Option 2: Scene-Specific Image Generation** (EXPENSIVE 💰)

**Concept**: Generate a custom image for each scene, then animate it with Runway.

#### Implementation
```typescript
async function generateSceneVideo(scene) {
  // Step 1: Generate scene-specific image
  const sceneImage = await generateRecipeImages({
    recipeTitle: scene.description,
    recipeData: {
      cuisine: 'cooking-process',
      ingredients: []
    },
    style: 'photography, overhead shot, ingredients on counter'
  });

  // Step 2: Animate that image with Runway
  const video = await runwayClient.imageToVideo.create({
    model: 'gen4_turbo',
    promptImage: sceneImage.url,
    promptText: scene.script,
    ratio: '1280:720',
    duration: 5,
  });

  return video;
}
```

#### Pros
- ✅ Recipe-specific visuals
- ✅ Perfect match between image and prompt

#### Cons
- ❌ **2x cost**: Image generation ($0.02) + video generation ($0.50) = **$0.52 per scene**
- ❌ **2x time**: ~10s for image + ~60s for video = **70s per scene**
- ❌ **Quality risk**: AI-generated images may not animate well

#### Cost Example
For a 3-scene video:
- Current: 3 videos × $0.50 = **$1.50**
- With image gen: 3 scenes × (image $0.02 + video $0.50) = **$1.56** (marginal increase)
- For 10 scenes: **$5.20** (significantly more expensive)

---

### **Option 3: Switch Video Generation Provider** (MAJOR CHANGE 🔄)

**Concept**: Use a provider that supports true text-to-video generation.

#### Alternative Providers

##### **Luma AI Dream Machine** ⭐ RECOMMENDED
- **Supports**: Text-to-video, image-to-video
- **Quality**: High (comparable to Runway)
- **Pricing**: $0.12/second (~$0.60 for 5s video, slightly more than Runway)
- **SDK**: `@lumalabs/lumaai-node` (already in Context7)
- **Integration**: Moderate (similar API structure to Runway)

Example:
```typescript
import LumaAI from '@lumalabs/lumaai';

const client = new LumaAI({ authToken: process.env.LUMA_API_KEY });

const generation = await client.generations.create({
  prompt: "In a bowl, combine flour, icing sugar, and shortening. Mix until crumbly.",
  aspectRatio: "16:9",
  loop: false,
});
```

##### **Pika Labs**
- **Supports**: Text-to-video, image-to-video
- **Quality**: Good (more stylized)
- **Pricing**: Credit-based (~$1/video)
- **SDK**: No official Node.js SDK (REST API only)
- **Integration**: Requires custom API wrapper

##### **Stability AI (Stable Video Diffusion)**
- **Supports**: Image-to-video only (same limitation as Runway)
- **Quality**: Good
- **Pricing**: $0.40 for 4s video
- **SDK**: `stability-client` available

#### Recommendation: **Luma AI**
- ✅ **True text-to-video**: Solves root problem
- ✅ **Good SDK**: Easy integration
- ✅ **Reasonable pricing**: Similar to Runway
- ✅ **High quality**: Professional results

#### Migration Effort
- **File**: `src/lib/openai-video-gen.ts` → Rename to `luma-video-gen.ts`
- **Code Changes**: ~200 lines (swap Runway SDK for Luma SDK)
- **Testing**: Re-generate all test scenes
- **Rollout**: Can run both providers in parallel, gradually migrate

---

## 🎯 **Recommended Approach**

### **Phase 1: Quick Win (Asset Library)** ✅
1. Add 10-15 generic cooking videos to Asset Library
2. Tag with categories (mixing, baking, cutting, etc.)
3. Implement scene-to-asset matching logic
4. Fall back to current Runway behavior if no match

**Timeline**: 1-2 days
**Cost**: ~$50-100 for stock cooking videos (one-time)
**Benefit**: Instant 80% of scenes handled, no per-generation cost

### **Phase 2: Strategic Migration (Luma AI)** 🚀
1. Install Luma AI SDK
2. Create `luma-video-gen.ts` wrapper
3. Add provider selection to video generation flow
4. A/B test Runway vs Luma quality
5. Migrate fully if Luma performs better

**Timeline**: 3-5 days
**Cost**: Similar to current Runway pricing
**Benefit**: True text-to-video for scenes without asset matches

### **Combined Strategy**
```typescript
async function generateSceneVideo(scene, assetLibrary, recipeImageUrl) {
  // 1. Try Asset Library first (free, instant)
  const matchingAsset = findMatchingAsset(scene, assetLibrary);
  if (matchingAsset) {
    console.log('✅ Using Asset Library video');
    return matchingAsset.url;
  }

  // 2. Try Luma AI text-to-video (if available)
  if (process.env.LUMA_API_KEY) {
    console.log('🎬 Generating video with Luma AI');
    return await generateLumaVideo(scene.script, scene.duration);
  }

  // 3. Fall back to Runway image-to-video (current behavior)
  console.log('⚠️  Falling back to Runway (will animate recipe image)');
  return await generateRunwayVideo(scene, recipeImageUrl);
}
```

---

## 📊 **Cost Comparison**

### Current (Runway Only)
- 3-scene video: **$1.50** (3 × $0.50)
- Problem: Animates recipe image instead of generating scenes

### Option 1: Asset Library + Runway
- 2 scenes from library: **$0** (free, already paid)
- 1 scene generated (Runway): **$0.50**
- **Total: $0.50** (67% cost reduction)

### Option 2: Image Gen + Runway
- 3 scenes: **$1.56** (3 × ($0.02 + $0.50))
- **Total: $1.56** (4% cost increase, better quality)

### Option 3: Luma AI Only
- 3 scenes: **$1.80** (3 × $0.60)
- **Total: $1.80** (20% cost increase, proper text-to-video)

### Hybrid (Asset Library + Luma AI)
- 2 scenes from library: **$0**
- 1 scene generated (Luma): **$0.60**
- **Total: $0.60** (60% cost reduction, best quality)

---

## ✅ **Next Steps**

### Immediate Actions
1. **Document current limitation** (this file) ✅
2. **Stop using Runway for non-matching scenes** (user awareness)
3. **Decide on strategy**: Asset Library vs Luma AI vs Both

### If Choosing Asset Library
1. Source/generate 15 generic cooking videos
2. Upload to Firebase Storage
3. Add to Asset Library with category tags
4. Implement scene matching in `openai-video-gen.ts`

### If Choosing Luma AI
1. Get Luma AI API key (https://lumalabs.ai)
2. Install SDK: `npm install @lumalabs/lumaai-node`
3. Create `luma-video-gen.ts` wrapper
4. Add provider selection to Server Actions
5. Test side-by-side with Runway

### If Choosing Both (RECOMMENDED)
1. Start with Asset Library (quick win)
2. Migrate to Luma AI for non-matching scenes
3. Keep Runway as fallback for edge cases

---

## 🤔 **Questions to Answer**

1. **Budget**: Can you afford Luma AI's 20% higher cost for better quality?
2. **Time**: Do you have 1-2 days to build Asset Library integration?
3. **Quality**: Is it acceptable to use generic cooking videos, or must scenes be recipe-specific?
4. **Existing assets**: Do you already have cooking videos, or need to source/generate them?

**Once you decide, I can implement the chosen solution!** 🚀

---

**Summary**: Runway ML can't generate videos from text alone - it only animates existing images. Your options are:
1. **Asset Library** (fast, cheap, generic)
2. **Luma AI** (proper text-to-video, slightly more expensive)
3. **Both** (best of both worlds)

I recommend starting with Asset Library integration (1-2 days), then adding Luma AI for scenes without matches.
