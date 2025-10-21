# Runway ML Video Generation Setup Guide

## Overview
The BanosCookbook video hub now uses **Runway ML Gen-4 Turbo** to generate actual videos from recipe images and video scripts. This replaces the previous DALL-E 3 image generation with real video generation.

## Features
- **Image-to-Video Generation**: Transforms static recipe images into cinematic 5-second videos
- **AI-Powered Camera Movements**: Smooth, professional cinematography
- **Script Integration**: Uses Gemini-generated video scripts to guide the video style
- **High Quality**: 1280x720 (720p) resolution, 16:9 aspect ratio
- **Automatic Sound**: Gen-4 can add sound effects and atmosphere

## Setup Instructions

### 1. Create Runway ML Account
1. Visit [https://dev.runwayml.com](https://dev.runwayml.com)
2. Click **"Get Started"** or **"Sign Up"**
3. Create your account (email + password or social login)

### 2. Get API Key
1. After logging in, go to the **Developer Portal**
2. Navigate to **API Keys** section
3. Click **"Create New API Key"**
4. Copy your API key (format: `rw_...`)

### 3. Add API Key to .env
Open your `.env` file and add:
```bash
RUNWAY_API_KEY=rw_your_actual_api_key_here
```

**Important**: Replace `rw_your_actual_api_key_here` with your actual Runway ML API key.

### 4. Restart Development Server
After adding the API key:
```powershell
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

## Pricing & Credits

### Runway ML Pricing Tiers
- **Build Tier** (Free): Limited credits per month for testing
- **Standard Tier**: $12/month - 625 credits/month
- **Pro Tier**: $28/month - 2250 credits/month
- **Unlimited Tier**: $76/month - Unlimited standard generations

### Video Generation Costs
- **Gen-4 Turbo** (5 seconds, 720p): ~10 credits per video
- **Gen-4 Turbo** (10 seconds, 1080p): ~20 credits per video

### Example Usage
With Standard Tier ($12/month):
- 625 credits ÷ 10 credits = **~62 videos per month**

## How It Works

### Workflow
```
Recipe Image (from Firestore)
    ↓
Video Script (Gemini-generated)
    ↓
Runway ML Gen-4 Turbo API
    ↓
5-Second Cinematic Video
    ↓
Saved to Firestore + Displayed in Modal
```

### Technical Flow
1. **User clicks "Generate Video with Runway ML"** in Video Hub
2. **Server Action** (`generateVideoStoryboardForRecipe`):
   - Fetches recipe from Firestore
   - Validates recipe has an image
   - Fetches video script from Firestore
   - Calls Runway ML utility
3. **Runway ML Utility** (`generateRecipeVideo`):
   - Initializes Runway ML SDK client
   - Calls `imageToVideo.create()` with:
     - `promptImage`: Recipe image URL
     - `promptText`: Video script + cinematography instructions
     - `model`: 'gen4_turbo'
     - `ratio`: '1280:720' (16:9)
     - `duration`: 5 seconds
   - Waits for task completion (1-2 minutes)
   - Returns video URL
4. **Video saved to Firestore** (`video_scripts` collection)
5. **Modal displays video** with video player controls

### Code Files
- **Utility**: `src/lib/openai-video-gen.ts` (renamed but handles Runway ML)
- **Server Action**: `src/app/actions.ts` → `generateVideoStoryboardForRecipe`
- **Modal Component**: `src/components/video-preview-modal.tsx`
- **Video Hub Page**: `src/app/videohub/page.tsx`

## Usage in Video Hub

### Prerequisites
Before generating a video, the recipe must have:
1. ✅ A recipe image (stored in Firestore `imageUrl` field)
2. ✅ A video script (generated using "Generate Video Script" button)

### Generate Video
1. Navigate to `/videohub`
2. Find a recipe with a generated script
3. Click **"🎬 Generate Video with Runway ML"**
4. Wait 1-2 minutes for video generation
5. Video plays automatically in modal
6. Download or open in new tab

## API Reference

### Runway ML SDK Methods

#### `imageToVideo.create()`
```typescript
const task = await client.imageToVideo.create({
  model: 'gen4_turbo',           // Model: gen4_turbo or gen4_aleph
  promptImage: string,            // URL or data URI of input image
  promptText: string,             // Text prompt (MAX 1000 characters)
  ratio: '1280:720' | '1920:1080', // Aspect ratio
  duration: 5 | 10,               // Video duration in seconds
});
```

**Important**: `promptText` has a **1000 character maximum**. The system automatically optimizes long video scripts to fit this limit by:
1. Extracting the first 3 lines (hook and key visuals)
2. Adding cinematography instructions
3. Ensuring total length ≤ 1000 characters

#### `waitForTaskOutput()`
```typescript
const result = await task.waitForTaskOutput();
// Returns: { output: [videoUrl], status: 'SUCCEEDED', ... }
```

#### `tasks.retrieve()`
```typescript
const task = await client.tasks.retrieve(taskId);
// Returns: { status, progress, output }
```

## Error Handling

### Common Errors

#### "RUNWAY_API_KEY is not defined"
**Solution**: Add `RUNWAY_API_KEY` to your `.env` file and restart the dev server.

#### "Recipe must have an image"
**Solution**: The recipe needs an image URL. Add an image to the recipe first.

#### "No video script found"
**Solution**: Generate a video script first using the "Generate Video Script" button.

#### "Task failed: insufficient credits"
**Solution**:
1. Check your Runway ML account credit balance
2. Upgrade your plan or wait for monthly credit renewal
3. Visit [https://dev.runwayml.com/usage](https://dev.runwayml.com/usage)

#### "Video generation timeout"
**Solution**: Video generation can take 1-2 minutes. If it times out:
1. Check your internet connection
2. Try again (Runway ML processes videos asynchronously)
3. Check Runway ML status: [https://status.runwayml.com](https://status.runwayml.com)

#### "Too big: expected string to have <=1000 characters"
**Solution**: This error occurs when the video script is too long for Runway ML's prompt limit.
- **Automatic Fix**: The system now automatically truncates prompts to fit the 1000 character limit
- **How it works**: Takes the first 3 lines of the script (the hook) + cinematography instructions
- **What gets used**: The most visually descriptive parts of your script
- **No action needed**: The video will generate using the optimized prompt

**Note**: Runway ML API has a 1000 character limit for `promptText`. The system intelligently extracts the most important visual elements from your script and adds professional cinematography instructions.

## Attribution Requirements

### Runway ML Branding
Per Runway ML's terms, you must display **"Powered by Runway"** when using videos publicly.

### Implementation
The modal already includes attribution:
```tsx
<div className="bg-gradient-to-r from-purple-50 to-blue-50 ...">
  <span>✨ Powered by Runway ML Gen-4 Turbo</span>
  ...
</div>
```

### Logo Usage
If you share videos publicly, download official logos:
- [Dark Logo (PNG)](https://runway-static-assets.s3.amazonaws.com/site/images/api-page/powered-by-runway-black.png)
- [Light Logo (PNG)](https://runway-static-assets.s3.amazonaws.com/site/images/api-page/powered-by-runway-white.png)

## Troubleshooting

### Video Quality Issues
**Problem**: Video looks blurry or low quality
**Solution**:
- Upgrade to `gen4_aleph` model (higher quality, more credits)
- Use higher resolution: `ratio: '1920:1080'`
- Ensure input recipe image is high quality (min 800x600px)

### Slow Generation Times
**Problem**: Videos take longer than 2 minutes
**Solution**:
- This is normal during peak hours
- Check [Runway ML status page](https://status.runwayml.com)
- Consider using `gen4_turbo` for faster generation

### Videos Look Too Static
**Problem**: Generated videos don't have enough movement
**Solution**:
- Improve video script prompts (add more descriptive camera movements)
- Try different prompt text like "slow zoom in, smooth pan, cinematic"
- Use `gen4_aleph` for more advanced camera control

## Testing

### Test Video Generation
1. Pick a recipe with a good image (high resolution, well-lit)
2. Generate a video script
3. Click "Generate Video with Runway ML"
4. Wait for completion
5. Verify video plays correctly
6. Test download functionality

### Playground Testing
Use the [Runway ML Playground](https://dev.runwayml.com/playground) to test:
- Different prompts
- Image quality requirements
- Model comparisons (gen4_turbo vs gen4_aleph)

## Future Enhancements

### Planned Features
- [ ] Longer videos (10-second option)
- [ ] Higher resolution (1080p option)
- [ ] Custom duration selector
- [ ] Multiple video variations per recipe
- [ ] Video thumbnail generation
- [ ] Direct Instagram posting from videos

### Switch to Sora API (When Available)
When OpenAI releases Sora API:
1. Update `src/lib/openai-video-gen.ts`
2. Switch from Runway ML SDK to OpenAI SDK
3. Update API key from `RUNWAY_API_KEY` to `OPENAI_API_KEY` (already configured)
4. Adjust prompt format for Sora
5. Update attribution in modal

## Resources

### Official Documentation
- [Runway ML Developer Docs](https://docs.dev.runwayml.com/)
- [API Reference](https://docs.dev.runwayml.com/api)
- [Gen-4 Turbo Guide](https://help.runwayml.com/hc/en-us/articles/37327109429011-Creating-with-Gen-4)
- [Pricing Details](https://docs.dev.runwayml.com/guides/pricing/)

### Community & Support
- [Runway ML Discord](https://discord.gg/runwayml)
- [Runway ML YouTube](https://youtube.com/runwayml)
- [Developer Forum](https://community.runwayml.com)

### Additional Tools
- [Video Playground](https://dev.runwayml.com/playground) - Test prompts
- [Usage Dashboard](https://dev.runwayml.com/usage) - Check credits
- [Status Page](https://status.runwayml.com) - API uptime

## Contact & Support

### Issues with Integration
If you encounter issues with the BanosCookbook integration:
1. Check this documentation first
2. Review error messages in browser console
3. Check server logs (terminal running `npm run dev`)
4. Verify API key is correct in `.env`

### Runway ML Support
For Runway ML API issues:
- Email: support@runwayml.com
- Discord: [discord.gg/runwayml](https://discord.gg/runwayml)
- Dev Portal: [dev.runwayml.com](https://dev.runwayml.com)

---

**Last Updated**: January 13, 2025
**Version**: 1.0
**Integration Status**: ✅ Active (Runway ML Gen-4 Turbo)
