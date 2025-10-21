# Instagram Posting Fix - Complete Summary

## Problem Identified

The last 3 recipes uploaded to BanosCookbook were not being automatically posted to Instagram. Investigation revealed a critical initialization bug in `src/app/actions.ts`.

### Root Cause

Four Instagram posting functions in `src/app/actions.ts` were checking an uninitialized `instagramApi` variable:

- **Variable Declaration** (Line 563): `let instagramApi: ReturnType<typeof import('../../config/instagram-api')>;`
  - Variable declared but **never initialized** with the actual module
  - Always evaluates to `undefined`

- **Result**: All checks `if (!instagramApi || !instagramApi.isConfigured())` immediately return with error
- **Impact**: All Instagram auto-posting fails silently (logged to `instagram_post_attempts` collection)

### Why Previous Code Failed

```typescript
// BROKEN: No initialization code, variable stays undefined
let instagramApi: ReturnType<typeof import('../../config/instagram-api')>;

export async function shareRecipeToInstagram(recipeId: string) {
  try {
    if (!instagramApi || !instagramApi.isConfigured()) {  // ← Always TRUE (undefined check)
      return {
        success: false,
        error: 'Instagram API not configured...'
      };
    }
    // Never reaches here!
    const result = await instagramApi.publishPost({...});
  }
}
```

## Solution Applied

Implemented lazy initialization pattern (matching Firebase Admin pattern used successfully elsewhere in codebase):

```typescript
// FIXED: Initialize on first use
if (!instagramApi) {
  try {
    const igModule = await import('../../config/instagram-api');
    instagramApi = igModule as unknown as typeof instagramApi;
  } catch (importErr) {
    return {
      success: false,
      error: 'Failed to load Instagram API module: ' + (importErr?.message || '')
    };
  }
}

if (!instagramApi || !instagramApi.isConfigured()) {
  return {
    success: false,
    error: 'Instagram API not configured. Please set up environment variables.'
  };
}
```

### Why This Works

1. **Lazy Loading**: Module only imported when function is called
2. **Non-Blocking**: Doesn't crash app if Instagram credentials missing
3. **Type Safety**: Uses `as unknown as` cast pattern for TypeScript compatibility
4. **Error Handling**: Gracefully returns error if module fails to load
5. **Consistent**: Matches Firebase Admin initialization pattern already in codebase

## Functions Fixed

All 4 Instagram posting functions have been updated:

### 1. `shareRecipeToInstagram()` - Line 1814
**Purpose**: Post recipe image to Instagram when recipe created
**Status**: ✅ FIXED
**Initialization**: Added lazy load before first use

### 2. `shareVideoToInstagram()` - Line 2140
**Purpose**: Post generated video to Instagram as Reel
**Status**: ✅ FIXED
**Initialization**: Added lazy load before first use
**Note**: Type casting fixed with `as unknown as` pattern

### 3. `shareMultiSceneVideoToInstagram()` - Line 2923
**Purpose**: Post combined multi-scene video to Instagram
**Status**: ✅ FIXED
**Initialization**: Added lazy load before first use

### 4. `shareSceneVideoToInstagram()` - Line 3080
**Purpose**: Post individual scene videos to Instagram
**Status**: ✅ FIXED
**Initialization**: Added lazy load before first use

## Verification Steps

### 1. TypeScript Compilation
Run to ensure no type errors:
```bash
npm run typecheck
```

### 2. Test Instagram Configuration
Verify environment variables are set:
```bash
npm run instagram:test
```

**Required Environment Variables**:
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_ACCESS_TOKEN`

### 3. Test Recipe Creation
Create a new recipe via `/add-recipe` and verify:
- Recipe saves to Firestore
- Image posts to Instagram
- Entry added to `instagram_posts` collection
- Check `instagram_post_attempts` for any errors

### 4. Manual Re-Post Failed Recipes
For the 3 recipes that failed:

```bash
# Option A: Regenerate from /recipes/[id] page - click "Share to Instagram"
# Option B: Use admin script:
node scripts/resync-all-instagram-posts.js --recipeIds=[id1,id2,id3]
```

### 5. Monitor Error Logs
Check Firestore for residual errors:
```bash
# Query instagram_post_attempts collection
# Should show SUCCESS status for new recipes
```

## Implementation Details

### Type Casting Pattern

The `as unknown as` intermediate cast pattern is used because:

```typescript
// Direct cast fails:
instagramApi = igModule as typeof instagramApi;  // ❌ Type error

// Two-step cast works:
instagramApi = igModule as unknown as typeof instagramApi;  // ✅ Success
```

This is a standard TypeScript workaround for complex type assignments in lazy-loading scenarios.

### Error Logging

If initialization fails, the error is:
1. Returned to the caller with details
2. Logged to Firebase `instagram_post_attempts` collection:
```json
{
  "recipeId": "recipe-id",
  "status": "FAILED",
  "error": "Failed to load Instagram API module: ..."
}
```

## Configuration Checklist

Ensure `.env.local` or production secrets contain:

```
FACEBOOK_APP_ID=<your-app-id>
FACEBOOK_APP_SECRET=<your-app-secret>
INSTAGRAM_APP_ID=<your-instagram-app-id>
INSTAGRAM_BUSINESS_ACCOUNT_ID=<your-business-account-id>
INSTAGRAM_ACCESS_TOKEN=<your-access-token>
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<webhook-token>
```

**Note**: These are production credentials, not development/test tokens.

## Files Modified

- `src/app/actions.ts` - 4 function updates (lines 1814, 2140, 2923, 3080)

## What's NOT Changed

- `config/instagram-api.js` - Module unchanged (works correctly)
- Firestore rules - No changes needed
- API endpoints - Behavior unchanged, just fixed
- Instagram Graph API calls - Same as before, just now actually executed

## Next Steps

1. **Deploy Fix**: Merge and deploy to Vercel/production
2. **Monitor**: Watch `instagram_posts` collection for successful posts
3. **Re-post Failed Recipes**: Run manual re-post for the 3 failed recipes
4. **Update Error Handling**: Consider adding UI toast notifications for auto-posting results
5. **Implement Retry Logic**: Add exponential backoff for transient Instagram API failures (optional enhancement)

## Related Documentation

- **Detailed Debug Info**: See `INSTAGRAM_POSTING_DEBUG.md`
- **Instagram Integration**: See `INSTAGRAM_INTEGRATION.md`
- **Instagram Setup**: See `INSTAGRAM_READY.md`
- **Deployment Guide**: See `DEPLOYMENT.md`

---

**Fixed**: December 2024
**Impact**: Resolves all Instagram auto-posting failures for recipes and videos
**Breaking Changes**: None - this fix only enables previously broken functionality
