/**
 * Server-side TikTok Content Posting API v2 integration.
 * NOT a 'use server' module — import from API routes or server actions only.
 */

export interface TikTokShareResult {
  postId?: string;
  error?: string;
}

/**
 * Shares a video to TikTok using the Content Posting API v2.
 * Requires TIKTOK_ACCESS_TOKEN and TIKTOK_CLIENT_KEY environment variables.
 */
export async function shareToTikTok(
  videoUrl: string,
  title: string,
  description: string
): Promise<TikTokShareResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const _clientKey = process.env.TIKTOK_CLIENT_KEY;

  if (!accessToken) {
    return { error: 'TikTok not configured' };
  }

  try {
    // Step 1: Initialize the video post
    const initRes = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: title.substring(0, 150),
            description: description.substring(0, 2200),
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
            privacy_level: 'PUBLIC_TO_EVERYONE',
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        }),
      }
    );

    if (!initRes.ok) {
      const errBody = await initRes.text();
      console.error('[TikTok] init failed:', initRes.status, errBody);
      return { error: `TikTok API error: ${initRes.status}` };
    }

    const initData = await initRes.json();
    const publishId = initData?.data?.publish_id as string | undefined;

    if (!publishId) {
      return { error: 'TikTok did not return a publish_id' };
    }

    return { postId: publishId };
  } catch (error) {
    console.error('[TikTok] shareToTikTok error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown TikTok error' };
  }
}
