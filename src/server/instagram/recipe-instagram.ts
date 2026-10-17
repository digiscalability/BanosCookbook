/**
 * Instagram posting and sync for recipes, moved out of src/app/actions.ts so it is
 * no longer a publicly callable server action.
 *
 * Callers:
 *   - shareRecipeToInstagramAction in actions.ts (admin-gated, VideoHub button)
 *   - /api/webhooks/instagram (signature-verified) for comment and like sync
 *
 * Only published recipes from Ammi's book may ever be posted (Abbas, 2026-10-17).
 * Delete shareRecipeToInstagram once the ventures-ops content engine posts.
 */
import type { firestore } from 'firebase-admin';

import adminConfig from '../../../config/firebase-admin';

interface InstagramPostData {
  imageUrl: string;
  caption: string;
}

interface InstagramVideoPostData {
  videoUrl: string;
  caption: string;
}

interface InstagramPostResult {
  id: string;
  permalink: string;
  timestamp: string;
}

interface InstagramComment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  like_count?: number;
}

interface InstagramMediaInsights {
  likeCount: number;
  commentsCount: number;
  timestamp: string;
}

type StorageFileLike = {
  makePublic?: () => Promise<void>;
  getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
  name?: string;
};

let instagramApi:
  | {
      isConfigured: () => boolean;
      publishPost: (post: InstagramPostData) => Promise<InstagramPostResult>;
      publishVideoPost: (post: InstagramVideoPostData) => Promise<InstagramPostResult>;
      getComments: (mediaId: string) => Promise<InstagramComment[]>;
      getMediaInsights: (mediaId: string) => Promise<InstagramMediaInsights>;
    }
  | undefined;

async function loadInstagramApi(): Promise<void> {
  if (instagramApi) return;
  try {
    const igModule = await import('../../../config/instagram-api');
    instagramApi = igModule as unknown as typeof instagramApi;
  } catch (err) {
    console.warn('[instagram] failed to load API module', err);
  }
}

async function ensureFirestore(): Promise<firestore.Firestore> {
  return adminConfig.getDb();
}

async function ensureFirebaseAdmin(): Promise<typeof import('firebase-admin')> {
  return adminConfig.getAdmin();
}

/** A recipe may be posted only if it is a published recipe from Ammi's book. */
export function isPostableRecipe(recipe: Record<string, unknown> | undefined | null): boolean {
  return !!recipe && recipe.source === 'ammi_book' && recipe.status === 'published';
}

export async function checkPostableRecipe(
  recipeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const snap = await (await ensureFirestore()).collection('recipes').doc(recipeId).get();
  if (!snap.exists) return { ok: false, error: 'Recipe not found' };
  if (!isPostableRecipe(snap.data())) {
    return {
      ok: false,
      error: "Only published recipes from Ammi's book can be posted to social media.",
    };
  }
  return { ok: true };
}

/**
 * Share a recipe to Instagram
 * Posts the recipe image with formatted caption to Instagram Business account
 */
export async function shareRecipeToInstagram(recipeId: string): Promise<{
  success: boolean;
  instagramPostId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    // Initialize instagramApi if not already loaded
    if (!instagramApi) {
      try {
        const igModule = await import('../../../config/instagram-api');
        instagramApi = igModule as unknown as typeof instagramApi;
      } catch (importErr) {
        return {
          success: false,
          error:
            'Failed to load Instagram API module: ' +
            (importErr instanceof Error ? importErr.message : String(importErr)),
        };
      }
    }

    // Check if Instagram is configured
    if (!instagramApi || !instagramApi.isConfigured()) {
      return {
        success: false,
        error: 'Instagram API not configured. Please set up environment variables.',
      };
    }

    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    if (!isPostableRecipe(recipe)) {
      return {
        success: false,
        error: "Only published recipes from Ammi's book can be posted to social media.",
      };
    }

    // Ensure we have an image URL (not data URI)
    const imageUrl = recipe.imageUrl;
    if (!imageUrl || imageUrl.startsWith('data:')) {
      return {
        success: false,
        error: 'Recipe must have a public image URL (not data URI) to post to Instagram',
      };
    }

    // Prefer using the recipe image URL. If it's hosted in Firebase Storage but
    // not publicly accessible, try to generate a short-lived signed URL. If that
    // fails and a Drive folder is configured, attempt to upload the image to
    // Google Drive and use the drive share link as a fallback.
    let postImageUrl = imageUrl as string;
    try {
      const isStorageUrl =
        String(imageUrl).includes('storage.googleapis.com') ||
        String(imageUrl).includes('firebasestorage.googleapis.com');
      if (isStorageUrl) {
        try {
          const admin = await ensureFirebaseAdmin();
          const storage = admin.storage();

          // Try to parse known storage URL formats to obtain bucket and path
          let bucketName: string | undefined;
          let filePath: string | undefined;
          try {
            const u = new URL(String(imageUrl));
            // Format: https://storage.googleapis.com/<bucket>/<path>
            const parts = u.pathname.split('/').filter(Boolean);
            if (u.hostname === 'storage.googleapis.com' && parts.length >= 2) {
              bucketName = parts[0];
              filePath = parts.slice(1).join('/');
            }
            // Format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media
            if (u.hostname.includes('firebasestorage.googleapis.com')) {
              const m = u.pathname.match(/\/v0\/b\/([^\/]+)\/o\/([^/]+)/);
              if (m) {
                bucketName = m[1];
                filePath = decodeURIComponent(m[2]);
              }
            }
          } catch {
            // ignore parse errors
          }

          if (!bucketName || !filePath) {
            // If we couldn't parse, attempt to use default bucket
            const envBucket = process.env.FIREBASE_STORAGE_BUCKET;
            if (envBucket) bucketName = envBucket;
            // For filePath try to derive from imageUrl by stripping bucket prefix
            try {
              const u2 = new URL(String(imageUrl));
              const pathParts = u2.pathname.split('/').filter(Boolean);
              // remove bucket if present
              if (pathParts.length > 1 && pathParts[0] === bucketName) {
                filePath = pathParts.slice(1).join('/');
              } else {
                filePath = pathParts.join('/');
              }
            } catch {}
          }

          if (bucketName && filePath) {
            const bucket = storage.bucket(bucketName);
            const file = bucket.file(filePath);
            try {
              // generate a short-lived signed URL (1 hour)
              const expires = Date.now() + 1000 * 60 * 60;
              const getSigned = (file as unknown as StorageFileLike).getSignedUrl;
              if (typeof getSigned === 'function') {
                const signedResult = await getSigned({ action: 'read', expires });
                const signedUrl = Array.isArray(signedResult) ? signedResult[0] : signedResult;
                if (typeof signedUrl === 'string' && signedUrl.length > 0) {
                  postImageUrl = signedUrl;
                  console.warn('Using signed URL for Instagram post:', signedUrl);
                }
              }
            } catch (signErr) {
              console.warn(
                'Failed to generate signed URL for storage image, will attempt Drive fallback if configured:',
                signErr instanceof Error ? signErr.message : String(signErr)
              );
            }
          }
        } catch (err) {
          console.warn(
            'Error while attempting to generate signed URL for storage-hosted image:',
            err instanceof Error ? err.message : String(err)
          );
        }
      }

      // If still not a likely-public URL and Drive is configured, try uploading to Drive
      const needsDriveFallback =
        !postImageUrl ||
        !postImageUrl.startsWith('http') ||
        postImageUrl.includes('firebasestorage.googleapis.com');
      if (needsDriveFallback && process.env.DRIVE_FOLDER_ID) {
        try {
          // Fetch image bytes
          const resp = await fetch(String(imageUrl));
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = resp.headers.get('content-type') || 'image/jpeg';

            // Dynamic import of googleapis to avoid requiring it in environments that don't need Drive
            const { google } = await import('googleapis');

            // Resolve credentials
            let creds: Record<string, unknown> | undefined;
            if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
              try {
                creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
              } catch {}
            }
            if (!creds && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
              try {
                const fs = await import('fs');
                const path = process.env.GOOGLE_APPLICATION_CREDENTIALS as string;
                creds = JSON.parse(fs.readFileSync(path, 'utf8'));
              } catch {}
            }

            if (!creds)
              throw new Error('No service account credentials available for Drive upload');

            const auth = new google.auth.GoogleAuth({
              credentials: creds as unknown as Record<string, unknown>,
              scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            const drive = google.drive({ version: 'v3', auth });

            const fileName = `recipe-${recipeId}-${Date.now()}.jpg`;
            const media = { mimeType: contentType, body: Buffer.from(buffer) } as {
              mimeType: string;
              body: Buffer;
            };

            const driveFolderId = process.env.DRIVE_FOLDER_ID;
            const createRes = await drive.files.create({
              requestBody: {
                name: fileName,
                parents: driveFolderId ? [driveFolderId] : undefined,
              },
              media,
              fields: 'id, webViewLink, webContentLink',
            });

            const fileId = createRes.data.id;
            const webViewLink = createRes.data.webViewLink || createRes.data.webContentLink;
            if (fileId) {
              // Make file publicly readable (best-effort)
              try {
                await drive.permissions.create({
                  fileId,
                  requestBody: { role: 'reader', type: 'anyone' },
                });
              } catch (permErr) {
                console.warn(
                  'Drive permission create failed:',
                  permErr instanceof Error ? permErr.message : String(permErr)
                );
              }

              if (webViewLink) {
                postImageUrl = webViewLink;
                console.warn('Uploaded image to Drive for Instagram posting:', webViewLink);
              }
            }
          } else {
            console.warn('Failed to fetch image bytes for Drive fallback, status:', resp.status);
          }
        } catch (driveErr) {
          console.warn(
            'Drive fallback failed:',
            driveErr instanceof Error ? driveErr.message : String(driveErr)
          );
        }
      }
    } catch (err) {
      console.warn(
        'Unexpected error preparing image URL for Instagram posting:',
        err instanceof Error ? err.message : String(err)
      );
    }

    // Build an intelligent, formatted caption (fallback template)
    type InstagramRecipe = {
      title?: string;
      description?: string;
      prepTime?: string;
      cookTime?: string;
      servings?: number | string;
      ingredients?: string[] | string;
      cuisine?: string;
    };

    async function generateInstagramCaption(recipeObj: InstagramRecipe): Promise<string> {
      try {
        const title =
          typeof recipeObj.title === 'string' && recipeObj.title.trim()
            ? recipeObj.title
            : 'Recipe';
        const desc = (typeof recipeObj.description === 'string' ? recipeObj.description : '').split(
          '\n'
        )[0];
        const prep = recipeObj.prepTime || 'N/A';
        const cook = recipeObj.cookTime || 'N/A';
        const serves = recipeObj.servings ?? 'N/A';

        // Extract ingredient keywords for hashtags
        const rawIngredients: string[] = Array.isArray(recipeObj.ingredients)
          ? recipeObj.ingredients.filter(Boolean).map(String)
          : typeof recipeObj.ingredients === 'string'
            ? recipeObj.ingredients
                .split(/[,;\n]/)
                .map(s => s.trim())
                .filter(Boolean)
            : [];

        const ingredientKeywords = rawIngredients
          .map(
            s =>
              s
                .replace(/\(.+?\)/g, '')
                .trim()
                .split(' ')[0]
          )
          .filter(s => !!s && s.length > 1)
          .slice(0, 4)
          .map(s => `#${s.replace(/[^a-z0-9]/gi, '')}`);

        const cuisineTag = recipeObj.cuisine
          ? `#${String(recipeObj.cuisine).replace(/\s+/g, '')}`
          : '';
        const baseTags = ['#recipe', cuisineTag, '#homemade', '#foodie', '#delicious'].filter(
          Boolean
        );
        const tags = Array.from(new Set([...baseTags, ...ingredientKeywords]))
          .slice(0, 8)
          .join(' ');

        const captionParts = [
          `🍽️ ${title}`,
          desc || undefined,
          rawIngredients.length
            ? `Key ingredients: ${rawIngredients
                .slice(0, 3)
                .map(s => s.trim())
                .filter(Boolean)
                .join(', ')}`
            : undefined,
          `⏱️ Prep: ${prep} | Cook: ${cook}`,
          `👥 Serves: ${serves}`,
          tags || undefined,
          `Full recipe: banoscookbook.com`,
        ].filter(Boolean);

        // Keep caption concise (Instagram prefers shorter intros)
        return captionParts.join('\n\n');
      } catch {
        return `🍽️ ${recipe && recipe.title ? String(recipe.title) : 'Recipe'}\nFull recipe: banoscookbook.com`;
      }
    }

    const caption = await generateInstagramCaption(recipe);

    // Post to Instagram
    if (!instagramApi) {
      return {
        success: false,
        error: 'Instagram API not initialized. Please check configuration.',
      };
    }

    // Prefer combined video (Reel) over static image if available
    const stepVideoDoc = await db.collection('recipe_step_videos').doc(recipeId).get();
    const combinedVideoUrl = stepVideoDoc.exists
      ? (stepVideoDoc.data()?.combinedVideoUrl as string | undefined)
      : undefined;
    const splitScenesDoc = await db.collection('split_scenes').doc(recipeId).get();
    const sceneCombinedUrl = splitScenesDoc.exists
      ? ((splitScenesDoc.data()?.combinedVideo as { url?: string } | undefined)?.url ??
         (splitScenesDoc.data()?.combinedVideoUrl as string | undefined))
      : undefined;
    const reelUrl = combinedVideoUrl || sceneCombinedUrl;

    let result: { id: string; permalink: string; timestamp: string };
    if (reelUrl) {
      result = (await instagramApi.publishVideoPost({
        videoUrl: reelUrl,
        caption: caption.trim(),
      })) as { id: string; permalink: string; timestamp: string };
    } else {
      result = (await instagramApi.publishPost({
        imageUrl: postImageUrl,
        caption: caption.trim(),
      })) as { id: string; permalink: string; timestamp: string };
    }

    // Save Instagram post mapping to Firestore
    await db.collection('instagram_posts').add({
      recipeId,
      instagramMediaId: result.id,
      instagramPermalink: result.permalink,
      postedAt: new Date(result.timestamp),
      caption,
      postedAsReel: Boolean(reelUrl),
      likeCount: 0,
      commentsCount: 0,
      lastSyncedAt: new Date(),
    });

    console.warn(`✅ Recipe "${recipe.title}" posted to Instagram: ${result.permalink}`);

    // Immediately try to sync comments and likes once published (best-effort)
    try {
      // syncInstagramComments and syncInstagramLikes are exported later in this file
      // call them to seed initial comment/like counts into Firestore
      // Fire-and-forget is acceptable, but we'll await to get initial data
      // (wrap in try/catch so errors don't fail the post)

      await syncInstagramComments(recipeId);

      await syncInstagramLikes(recipeId);
      console.warn('✅ Initial Instagram comments/likes sync completed');
    } catch (syncErr) {
      console.warn(
        'Initial sync after publish failed (non-fatal):',
        syncErr instanceof Error ? syncErr.message : syncErr
      );
    }

    return {
      success: true,
      instagramPostId: result.id,
      permalink: result.permalink,
    };
  } catch (error) {
    console.error('❌ Error posting to Instagram:', error);
    try {
      const db = await ensureFirestore();
      await db.collection('instagram_post_attempts').add({
        recipeId,
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Failed to log instagram_post_attempts:', logErr);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post to Instagram',
    };
  }
}

/**
 * Sync Instagram comments for a recipe
 * Fetches comments from Instagram and adds them to the recipe
 */
export async function syncInstagramComments(recipeId: string): Promise<{
  success: boolean;
  commentsSynced?: number;
  error?: string;
}> {
  try {
    await loadInstagramApi();
    if (!instagramApi || !instagramApi.isConfigured()) {
      return { success: false, error: 'Instagram API not configured' };
    }

    const db = await ensureFirestore();

    // Find Instagram post for this recipe
    const instagramPostsSnapshot = await db
      .collection('instagram_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (instagramPostsSnapshot.empty) {
      return { success: false, error: 'No Instagram post found for this recipe' };
    }

    const instagramPost = instagramPostsSnapshot.docs[0];
    const instagramData = instagramPost.data();
    const mediaId = instagramData.instagramMediaId;

    // Fetch comments from Instagram
    let instagramComments = [];
    try {
      if (!instagramApi) {
        return { success: false, error: 'Instagram API not initialized' };
      }
      instagramComments = await instagramApi.getComments(mediaId);
      console.warn(
        `🔁 Fetched ${Array.isArray(instagramComments) ? instagramComments.length : 'unknown'} comments from Instagram for media ${mediaId}`
      );
    } catch (igErr) {
      console.error(
        '❌ Failed to fetch comments from Instagram API:',
        igErr instanceof Error ? igErr.message : igErr
      );
      return { success: false, error: igErr instanceof Error ? igErr.message : String(igErr) };
    }

    // Get recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    const existingComments = recipe?.comments || [];

    // Check which Instagram comments are new
    const existingInstagramCommentIds = new Set(
      existingComments
        .filter((c: { instagramCommentId?: string }) => c.instagramCommentId)
        .map((c: { instagramCommentId: string }) => c.instagramCommentId)
    );

    let newCommentCount = 0;

    for (const igComment of instagramComments) {
      // Skip if already synced
      if (existingInstagramCommentIds.has(igComment.id)) {
        continue;
      }

      // Add new comment
      const newComment = {
        id: `ig_${igComment.id}`,
        author: igComment.username,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(igComment.username)}&background=A7D1AB&color=fff`,
        text: igComment.text,
        timestamp: new Date(igComment.timestamp).toISOString(),
        likes: igComment.like_count || 0,
        isFromInstagram: true,
        instagramCommentId: igComment.id,
        instagramUsername: igComment.username,
        replies: [],
      };

      existingComments.push(newComment);
      newCommentCount++;
    }

    // Update recipe with new comments
    if (newCommentCount > 0) {
      await db.collection('recipes').doc(recipeId).update({
        comments: existingComments,
        updatedAt: new Date(),
      });
    }

    // Update Instagram post metadata
    try {
      if (!instagramApi) {
        console.warn('Instagram API not initialized, skipping insights update');
      } else {
        const insights = (await instagramApi.getMediaInsights(mediaId)) as {
          likeCount: number;
          commentsCount: number;
          timestamp: string;
        };
        console.warn(
          `📊 Media insights for ${mediaId}: likes=${insights.likeCount} comments=${insights.commentsCount}`
        );
        await instagramPost.ref.update({
          likeCount: insights.likeCount,
          commentsCount: insights.commentsCount,
          lastSyncedAt: new Date(),
        });
      }
    } catch (insErr) {
      console.error(
        '❌ Failed to fetch media insights from Instagram API:',
        insErr instanceof Error ? insErr.message : insErr
      );
      // Continue - don't fail entire sync on insights error
    }

    console.warn(`✅ Synced ${newCommentCount} new comments from Instagram`);

    return {
      success: true,
      commentsSynced: newCommentCount,
    };
  } catch (error) {
    console.error('❌ Error syncing Instagram comments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync comments',
    };
  }
}

/**
 * Sync Instagram likes for a recipe
 * Updates like count from Instagram
 */
export async function syncInstagramLikes(recipeId: string): Promise<{
  success: boolean;
  likeCount?: number;
  error?: string;
}> {
  try {
    await loadInstagramApi();
    if (!instagramApi || !instagramApi.isConfigured()) {
      return { success: false, error: 'Instagram API not configured' };
    }

    const db = await ensureFirestore();

    // Find Instagram post
    const instagramPostsSnapshot = await db
      .collection('instagram_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (instagramPostsSnapshot.empty) {
      return { success: false, error: 'No Instagram post found for this recipe' };
    }

    const instagramPost = instagramPostsSnapshot.docs[0];
    const instagramData = instagramPost.data();
    const mediaId = instagramData.instagramMediaId;

    // Get insights
    try {
      if (!instagramApi) {
        return { success: false, error: 'Instagram API not initialized' };
      }
      const insights = (await instagramApi.getMediaInsights(mediaId)) as {
        likeCount: number;
        commentsCount: number;
        timestamp: string;
      };
      await instagramPost.ref.update({
        likeCount: insights.likeCount,
        commentsCount: insights.commentsCount,
        lastSyncedAt: new Date(),
      });

      console.warn(`✅ Synced Instagram likes: ${insights.likeCount}`);

      return {
        success: true,
        likeCount: insights.likeCount,
      };
    } catch (err) {
      console.error(
        '❌ Failed to fetch media insights when syncing likes:',
        err instanceof Error ? err.message : String(err)
      );
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  } catch (error) {
    console.error('❌ Error syncing Instagram likes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync likes',
    };
  }
}
