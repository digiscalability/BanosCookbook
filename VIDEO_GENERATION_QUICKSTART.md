# 🎬 Video Generation Integration - Quick Start

## ✅ What's Been Done

### 1. **Runway ML SDK Installed**
```bash
npm install @runwayml/sdk
```

### 2. **Video Generation Utility Created**
- **File**: `src/lib/openai-video-gen.ts`
- **Function**: `generateRecipeVideo(recipeImageUrl, recipeTitle, videoScript)`
- **Technology**: Runway ML Gen-4 Turbo
- **Output**: 5-second cinematic video (1280x720, 16:9)

### 3. **Server Action Updated**
- **File**: `src/app/actions.ts`
- **Function**: `generateVideoStoryboardForRecipe(recipeId)`
- **Changes**:
  - Fetches recipe image from Firestore
  - Validates image exists
  - Calls Runway ML API
  - Returns video URL instead of image URL
  - Saves video URL to Firestore

### 4. **Video Preview Modal Updated**
- **File**: `src/components/video-preview-modal.tsx`
- **Features**:
  - Video player with controls
  - Autoplay and loop
  - Download video functionality
  - Attribution for Runway ML
  - Error handling with setup instructions

### 5. **Video Hub Page Updated**
- **File**: `src/app/videohub/page.tsx`
- **Changes**:
  - Button text: "🎬 Generate Video with Runway ML"
  - Handles video URL instead of image URL
  - Passes video URL to modal

### 6. **Environment Variable Added**
- **File**: `.env`
- **Variable**: `RUNWAY_API_KEY=your_runway_api_key_here`
- **Template**: Updated in `env-template.txt`

### 7. **Documentation Created**
- **File**: `RUNWAY_ML_SETUP.md`
- **Content**: Complete setup guide with:
  - Account creation steps
  - API key setup
  - Pricing information
  - Error handling
  - Attribution requirements
  - Troubleshooting guide

## 🚀 Next Steps (Required to Use)

### Step 1: Get Runway ML API Key
1. Visit [https://dev.runwayml.com](https://dev.runwayml.com)
2. Sign up for an account
3. Navigate to Developer Portal → API Keys
4. Create new API key
5. Copy the key (format: `rw_...`)

### Step 2: Add API Key to .env
Open `.env` and replace:
```bash
RUNWAY_API_KEY=your_runway_api_key_here
```
With your actual key:
```bash
RUNWAY_API_KEY=rw_abc123xyz...
```

### Step 3: Restart Dev Server
```powershell
# Stop server (Ctrl+C)
npm run dev
```

### Step 4: Test Video Generation
1. Go to [http://localhost:9002/videohub](http://localhost:9002/videohub)
2. Find a recipe with:
   - ✅ A recipe image
   - ✅ A generated video script
3. Click **"🎬 Generate Video with Runway ML"**
4. Wait 1-2 minutes
5. Video should play in modal!

## 💰 Pricing Overview

### Free Tier
- Limited credits for testing
- Perfect for development

### Standard Tier ($12/month)
- 625 credits/month
- ~62 videos (10 credits each)
- Recommended for production

### Costs Per Video
- **5-second video (720p)**: ~10 credits
- **10-second video (1080p)**: ~20 credits

## 🎯 How It Works

```
User clicks "Generate Video"
  ↓
Recipe image fetched from Firestore
  ↓
Video script fetched from Firestore
  ↓
Runway ML Gen-4 Turbo processes (1-2 min)
  ↓
Video URL returned
  ↓
Video saved to Firestore
  ↓
Video plays in modal with controls
```

## 🔧 Technical Details

### Input Requirements
- **Recipe Image**: Must exist in Firestore (`imageUrl` field)
- **Video Script**: Must be generated first
- **Image Format**: JPG, PNG, WebP
- **Image Size**: Minimum 800x600px recommended
- **Prompt Length**: Auto-optimized to ≤1000 characters (Runway ML limit)

### Output Specifications
- **Format**: MP4
- **Resolution**: 1280x720 (720p)
- **Aspect Ratio**: 16:9
- **Duration**: 5 seconds
- **Frame Rate**: 24 fps
- **Quality**: High (Gen-4 Turbo)

### API Details
- **Model**: `gen4_turbo`
- **Method**: Image-to-video
- **Wait Time**: 60-120 seconds
- **SDK**: `@runwayml/sdk`

## 📝 Code Changes Summary

### Modified Files
1. ✅ `src/lib/openai-video-gen.ts` - Runway ML integration
2. ✅ `src/app/actions.ts` - Video generation server action
3. ✅ `src/components/video-preview-modal.tsx` - Video player
4. ✅ `src/app/videohub/page.tsx` - UI updates
5. ✅ `.env` - API key placeholder
6. ✅ `env-template.txt` - Template update

### New Files
1. ✅ `RUNWAY_ML_SETUP.md` - Complete setup guide
2. ✅ `VIDEO_GENERATION_QUICKSTART.md` - This file

### Dependencies Added
1. ✅ `@runwayml/sdk` - Runway ML Node.js SDK

## ⚠️ Important Notes

### Attribution Required
When using videos publicly, you **must** display "Powered by Runway" per Runway ML's terms. The modal already includes this.

### API Key Security
- ✅ Never commit `.env` file
- ✅ Keep `RUNWAY_API_KEY` private
- ✅ Use environment variables in production (Vercel, Firebase, etc.)

### Credit Management
- Monitor credit usage at [dev.runwayml.com/usage](https://dev.runwayml.com/usage)
- Set up billing alerts
- Credits reset monthly (subscription plans)

### Error Handling
The system handles:
- ✅ Missing API key → Clear error message with setup instructions
- ✅ Missing recipe image → Prompts user to add image first
- ✅ Missing script → Prompts user to generate script
- ✅ API failures → Displays error details
- ✅ Timeout issues → Automatic retry recommendations
- ✅ Long prompts → Auto-truncates to 1000 character limit

### Prompt Optimization
Runway ML has a **1000 character limit** for prompts. The system automatically:
1. Extracts the first 3 lines of your video script (the hook)
2. Adds professional cinematography instructions
3. Ensures total prompt ≤ 1000 characters
4. Preserves the most visually descriptive content

**No action needed** - This happens automatically!

## 🔍 Troubleshooting

### "RUNWAY_API_KEY is not defined"
**Solution**: Add the key to `.env` and restart server

### "Recipe must have an image"
**Solution**: Add an image to the recipe first (upload or AI generate)

### "No video script found"
**Solution**: Click "Generate Video Script" button first

### "Insufficient credits"
**Solution**: Check balance at [dev.runwayml.com/usage](https://dev.runwayml.com/usage) and upgrade plan

### Video generation hangs
**Solution**: Wait 2 minutes, check [status.runwayml.com](https://status.runwayml.com), try again

## 📚 Resources

- 📖 [Full Setup Guide](./RUNWAY_ML_SETUP.md)
- 🌐 [Runway ML Docs](https://docs.dev.runwayml.com/)
- 💬 [Discord Support](https://discord.gg/runwayml)
- 🎮 [API Playground](https://dev.runwayml.com/playground)

## 🎉 Ready to Generate Videos!

Once you add your `RUNWAY_API_KEY`, you can:
- Generate cinematic recipe videos
- Download videos for social media
- Share videos with Runway attribution
- Upgrade to longer/higher quality videos

**Questions?** Check `RUNWAY_ML_SETUP.md` for detailed documentation.

---

**Integration Status**: ✅ Complete - Ready for API key
**Last Updated**: January 13, 2025
**Technology**: Runway ML Gen-4 Turbo
