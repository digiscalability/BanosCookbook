# Instagram Posting Issue - Root Cause Analysis

## Problem Summary
The last 3 recipes (and likely all recent recipes) are NOT being posted to Instagram automatically, despite the Instagram integration code being present and seemingly functional.

## Root Cause: instagramApi Never Initialized

### Issue Location
**File:** `src/app/actions.ts`

**Problem:** The `instagramApi` variable is declared but **NEVER IMPORTED OR INITIALIZED**.

```typescript
// Line 563 - Declaration only:
let instagramApi: {
  isConfigured: () => boolean;
  publishPost: (post: InstagramPostData) => Promise<InstagramPostResult>;
  publishVideoPost: (post: InstagramVideoPostData) => Promise<InstagramPostResult>;
  getComments: (mediaId: string) => Promise<InstagramComment[]>;
  getMediaInsights: (mediaId: string) => Promise<InstagramMediaInsights>;
} | undefined;

// But NO initialization code exists anywhere in the file!
```

### Why It Fails

In the `shareRecipeToInstagram()` function (line 1822):

```typescript
// This check ALWAYS returns false because instagramApi is undefined:
if (!instagramApi || !instagramApi.isConfigured()) {
  return {
    success: false,
    error: 'Instagram API not configured. Please set up environment variables.'
  };
}
```

Since `instagramApi` is `undefined`, the condition `!instagramApi` evaluates to `true`, and the function immediately returns a failure response.

### Expected Behavior

The `instagramApi` should be dynamically imported and initialized lazily (similar to how `getDb` and `getAdmin` are handled). The config exists at `config/instagram-api.js` but is never loaded.

### Comparison with Firebase Admin Pattern

**Firebase Admin (WORKING):**
```typescript
// Lazy initialization pattern in actions.ts:
if (!getDb) {
  const adminConfig = await import('../../config/firebase-admin');
  getDb = adminConfig.getDb;
}
const db = getDb!();
```

**Instagram API (BROKEN):**
```typescript
// Never imported or initialized!
// The config exists at config/instagram-api.js but has NO lazy loading code
```

## Flow Diagram: Why Instagram Posts Fail

```
1. Recipe Created → POST /api/recipes
2. API Route calls → shareRecipeToInstagram(newRecipeId)
3. Function executes → shareRecipeToInstagram() in actions.ts (line 1814)
4. Check fails → if (!instagramApi) { return error }
   ↓
   instagramApi = undefined (because it was never initialized)
   ↓
   EARLY RETURN: "Instagram API not configured"
5. ERROR LOGGED → instagram_post_attempts collection gets error entry
6. RECIPE SAVED ANYWAY → but NOT posted to Instagram ❌
```

## Evidence in Code

### Location 1: Declaration (Line 563)
```typescript
let instagramApi: { ... } | undefined;  // Declared but never initialized
```

### Location 2: Check (Line 1822)
```typescript
if (!instagramApi || !instagramApi.isConfigured()) {
  return {
    success: false,
    error: 'Instagram API not configured. Please set up environment variables.'
  };
}
```

### Location 3: Usage (Line 2050)
```typescript
const result = await instagramApi.publishPost({  // Called after check, but still undefined
  imageUrl: postImageUrl,
  caption: caption.trim()
});
```

### Location 4: Error Logging (Line 2070)
```typescript
await db.collection('instagram_post_attempts').add({
  recipeId,
  error: error instanceof Error ? error.message : String(error),
  createdAt: new Date(),
});
```

This means all failed Instagram posts are being logged to `instagram_post_attempts` collection, which likely contains entries for all 3 (and more) recipes with the error message:
```
"Instagram API not configured. Please set up environment variables."
```

## Solution

Add lazy initialization of `instagramApi` in the `shareRecipeToInstagram()` function:

```typescript
export async function shareRecipeToInstagram(recipeId: string): Promise<{
  success: boolean;
  instagramPostId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    // MISSING CODE: Initialize instagramApi if not already done
    if (!instagramApi) {
      try {
        instagramApi = await import('../../config/instagram-api');
      } catch (importErr) {
        return {
          success: false,
          error: 'Failed to load Instagram API module: ' +
                 (importErr instanceof Error ? importErr.message : String(importErr))
        };
      }
    }

    // Check if Instagram is configured
    if (!instagramApi || !instagramApi.isConfigured()) {
      return {
        success: false,
        error: 'Instagram API not configured. Please set up environment variables.'
      };
    }

    // ... rest of function
  } catch (error) {
    // ... error handling
  }
}
```

**Same fix needed in:**
- `shareVideoToInstagram()` (line ~2110)
- `shareSceneVideoToInstagram()` (if it exists)
- `shareMultiSceneVideoToInstagram()` (if it exists)
- Any other function that uses `instagramApi`

## Verification Steps

1. **Check `instagram_post_attempts` collection in Firestore:**
   - Should contain error entries for recipes that failed to post
   - All errors should reference: "Instagram API not configured"

2. **Search actions.ts for instagramApi usage:**
   - `grep -n "instagramApi" src/app/actions.ts`
   - Should show declaration (line 563) and multiple usage sites
   - Should show NO initialization

3. **After fix, test with:**
   ```bash
   npm run instagram:test  # Validate credentials are correct
   ```

4. **Create a test recipe via /add-recipe:**
   - Check if it now posts to Instagram
   - Verify `instagram_posts` collection has new entry
   - Check Instagram account directly

## Impact

- **All recipes created since Instagram integration:** NOT posted ❌
- **Workaround:** Manual posting via UI button (if implemented)
- **Previous recipes:** Depends on when integration was added
- **After fix:** Future recipes will post automatically ✓

## Next Steps

1. Apply the lazy initialization fix to all Instagram API usage sites
2. Test with `npm run instagram:test`
3. Create a test recipe and verify it posts to Instagram
4. Consider implementing a bulk re-posting script for the 3+ recipes that failed
5. Monitor `instagram_post_attempts` collection for new errors
