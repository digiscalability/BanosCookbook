// Instagram API configuration with lazy initialization
// Similar pattern to firebase-admin.js to avoid crashes when credentials are missing

/**
 * Instagram Graph API client for BanosCookbook
 *
 * Environment variables required:
 * - FACEBOOK_APP_ID: Your Facebook App ID
 * - FACEBOOK_APP_SECRET: Your Facebook App Secret
 * - INSTAGRAM_APP_ID: Your Instagram App ID
 * - INSTAGRAM_BUSINESS_ACCOUNT_ID: Your Instagram Business Account ID (numeric)
 *
 * Optional:
 * - INSTAGRAM_ACCESS_TOKEN: Long-lived user access token (auto-refreshed if configured)
 */

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

let _config = null;

/**
 * Initialize Instagram API configuration
 */
function initConfig() {
  if (_config) return _config;

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const instagramAppId = process.env.INSTAGRAM_APP_ID;
  const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!appId || !appSecret || !instagramAppId || !instagramAccountId) {
    console.warn('Instagram API credentials not fully configured. Some features will be disabled.');
    return null;
  }

  _config = {
    appId,
    appSecret,
    instagramAppId,
    instagramAccountId,
    graphApiBase: GRAPH_API_BASE,
  };

  return _config;
}

/**
 * Get Instagram API configuration
 * @throws {Error} If credentials are not configured
 */
function getConfig() {
  const config = initConfig();
  if (!config) {
    throw new Error(
      'Instagram API not configured. Please set FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, INSTAGRAM_APP_ID, and INSTAGRAM_BUSINESS_ACCOUNT_ID environment variables.'
    );
  }
  return config;
}

/**
 * Refresh a long-lived Instagram token via the Graph API.
 * Stores the refreshed token in Firestore on success.
 * @param {string} token - The current long-lived token to refresh
 * @returns {Promise<string|null>} New token or null on failure
 */
async function refreshLongLivedToken(token) {
  const config = initConfig();
  if (!config) return null;
  try {
    const url = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.appId}&client_secret=${config.appSecret}&fb_exchange_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    // Store refreshed token in Firestore
    try {
      const admin = require('./firebase-admin');
      if (admin && typeof admin.getDb === 'function') {
        const db = admin.getDb();
        const expiresAt = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000);
        await db.collection('instagram_tokens').doc('main').set({
          accessToken: data.access_token,
          expiresAt: expiresAt.toISOString(),
          refreshedAt: new Date().toISOString(),
        });
      }
    } catch {}
    return data.access_token;
  } catch { return null; }
}

/**
 * Save an access token to Firestore with expiry metadata.
 * @param {string} token - The long-lived access token to store
 * @param {number} [expiresIn=5184000] - Seconds until token expires (default 60 days)
 * @returns {Promise<void>}
 */
async function saveAccessToken(token, expiresIn) {
  const admin = require('./firebase-admin');
  if (!admin || typeof admin.getDb !== 'function') {
    throw new Error('Firebase Admin not available — cannot save token');
  }
  const db = admin.getDb();
  const expiresAt = new Date(Date.now() + (expiresIn ?? 5184000) * 1000);
  await db.collection('instagram_tokens').doc('main').set({
    accessToken: token,
    expiresAt: expiresAt.toISOString(),
    connectedAt: new Date().toISOString(),
  });
}

/**
 * Get or generate access token.
 * Checks Firestore first (auto-refreshes within 7 days of expiry), then falls back to env var.
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  // 1. Check Firestore for a stored/refreshed token (takes precedence over env var)
  try {
    const admin = require('./firebase-admin');
    if (admin && typeof admin.getDb === 'function') {
      const db = admin.getDb();
      const tokenDoc = await db.collection('instagram_tokens').doc('main').get();
      if (tokenDoc.exists) {
        const data = tokenDoc.data();
        const token = data.accessToken;
        const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
        if (token && expiresAt && expiresAt > new Date()) {
          // Auto-refresh if within 7 days of expiry
          const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          if (expiresAt < sevenDaysFromNow) {
            const refreshed = await refreshLongLivedToken(token);
            if (refreshed) return refreshed;
          }
          return token;
        }
        if (token && !expiresAt) return token; // Legacy: no expiry stored, use it
      }
    }
  } catch (e) { /* Firestore unavailable, fall through */ }

  // 2. Fall back to env var
  const storedToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (storedToken) return storedToken;

  throw new Error('INSTAGRAM_ACCESS_TOKEN not configured or expired. Reconnect Instagram in Settings.');
}

/**
 * Publish an image post to Instagram
 * @param {Object} params
 * @param {string} params.imageUrl - Public URL of the image to post
 * @param {string} params.caption - Post caption
 * @param {string} [params.accessToken] - Optional access token (uses env var if not provided)
 * @returns {Promise<Object>} Instagram media object with id and permalink
 */
async function publishPost({ imageUrl, caption, accessToken }) {
  const config = getConfig();
  const token = accessToken || (await getAccessToken());

  // Step 1: Create media container
  const containerUrl = `${config.graphApiBase}/${config.instagramAccountId}/media`;
  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption,
      access_token: token,
    }),
  });

  const containerData = await containerResponse.json();
  if (containerData.error) {
    throw new Error(`Instagram API Error: ${containerData.error.message}`);
  }

  const creationId = containerData.id;

  // Step 2: Publish the container
  const publishUrl = `${config.graphApiBase}/${config.instagramAccountId}/media_publish`;
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: token,
    }),
  });

  const publishData = await publishResponse.json();
  if (publishData.error) {
    throw new Error(`Instagram Publish Error: ${publishData.error.message}`);
  }

  // Step 3: Get the published post details (permalink)
  const mediaId = publishData.id;
  const mediaUrl = `${config.graphApiBase}/${mediaId}?fields=id,permalink,timestamp&access_token=${token}`;
  const mediaResponse = await fetch(mediaUrl);
  const mediaData = await mediaResponse.json();

  return {
    id: mediaData.id,
    permalink: mediaData.permalink,
    timestamp: mediaData.timestamp,
  };
}

/**
 * Publish a video post to Instagram (Reels)
 * @param {Object} params
 * @param {string} params.videoUrl - Public URL of the video to post
 * @param {string} params.caption - Post caption
 * @param {string} [params.accessToken] - Optional access token (uses env var if not provided)
 * @returns {Promise<Object>} Instagram media object with id and permalink
 */
async function publishVideoPost({ videoUrl, caption, accessToken }) {
  const config = getConfig();
  const token = accessToken || (await getAccessToken());

  // Step 1: Create media container for video
  const containerUrl = `${config.graphApiBase}/${config.instagramAccountId}/media`;
  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      access_token: token,
    }),
  });

  const containerData = await containerResponse.json();
  if (containerData.error) {
    throw new Error(`Instagram API Error: ${containerData.error.message}`);
  }

  const creationId = containerData.id;

  // Step 2: Publish the container
  const publishUrl = `${config.graphApiBase}/${config.instagramAccountId}/media_publish`;
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: token,
    }),
  });

  const publishData = await publishResponse.json();
  if (publishData.error) {
    throw new Error(`Instagram Publish Error: ${publishData.error.message}`);
  }

  // Step 3: Get the published post details
  const mediaId = publishData.id;
  const mediaUrl = `${config.graphApiBase}/${mediaId}?fields=id,permalink,timestamp&access_token=${token}`;
  const mediaResponse = await fetch(mediaUrl);
  const mediaData = await mediaResponse.json();

  return {
    id: mediaData.id,
    permalink: mediaData.permalink,
    timestamp: mediaData.timestamp,
  };
}

/**
 * Get comments for an Instagram post
 * @param {string} mediaId - Instagram media ID
 * @param {string} [accessToken] - Optional access token
 * @returns {Promise<Array>} Array of comment objects
 */
async function getComments(mediaId, accessToken) {
  const config = getConfig();
  const token = accessToken || (await getAccessToken());

  // The comments endpoint is paginated. Fetch all pages to ensure we
  // collect every comment (useful for posts with many comments).
  const fields = 'id,text,username,timestamp,like_count';
  let nextUrl = `${config.graphApiBase}/${mediaId}/comments?fields=${fields}&access_token=${token}`;
  const allComments = [];

  try {
    while (nextUrl) {
      const resp = await fetch(nextUrl);
      const body = await resp.json();

      if (body.error) {
        // Include whole body for debugging
        throw new Error(`Instagram API Error fetching comments: ${JSON.stringify(body)}`);
      }

      if (Array.isArray(body.data)) {
        allComments.push(...body.data);
      }

      // Follow paging.next if present
      nextUrl = body.paging && body.paging.next ? body.paging.next : null;
    }

    return allComments;
  } catch (err) {
    // Re-throw with additional context for server logs
    if (err instanceof Error) throw new Error(`getComments failed for mediaId=${mediaId}: ${err.message}`);
    throw err;
  }
}

/**
 * Get insights (likes, reach, etc.) for an Instagram post
 * @param {string} mediaId - Instagram media ID
 * @param {string} [accessToken] - Optional access token
 * @returns {Promise<Object>} Insights data including like_count
 */
async function getMediaInsights(mediaId, accessToken) {
  const config = getConfig();
  const token = accessToken || (await getAccessToken());

  const url = `${config.graphApiBase}/${mediaId}?fields=id,like_count,comments_count,timestamp&access_token=${token}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.error) {
      throw new Error(`Instagram API Error fetching insights: ${JSON.stringify(data)}`);
    }

    return {
      likeCount: typeof data.like_count === 'number' ? data.like_count : 0,
      commentsCount: typeof data.comments_count === 'number' ? data.comments_count : 0,
      timestamp: data.timestamp,
    };
  } catch (err) {
    if (err instanceof Error) throw new Error(`getMediaInsights failed for mediaId=${mediaId}: ${err.message}`);
    throw err;
  }
}

/**
 * Reply to an Instagram comment
 * @param {string} commentId - Instagram comment ID
 * @param {string} message - Reply text
 * @param {string} [accessToken] - Optional access token
 * @returns {Promise<Object>} Reply object
 */
async function replyToComment(commentId, message, accessToken) {
  const config = getConfig();
  const token = accessToken || (await getAccessToken());

  const url = `${config.graphApiBase}/${commentId}/replies`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      access_token: token,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Instagram API Error: ${data.error.message}`);
  }

  return data;
}

/**
 * Check if Instagram API is configured
 * @returns {boolean}
 */
function isConfigured() {
  return initConfig() !== null;
}

module.exports = {
  getConfig,
  getAccessToken,
  refreshLongLivedToken,
  saveAccessToken,
  publishPost,
  publishVideoPost,
  getComments,
  getMediaInsights,
  replyToComment,
  isConfigured,
};
