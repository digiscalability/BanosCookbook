# Instagram Integration Setup Guide

## Overview

BanosCookbook automatically posts recipes to Instagram and syncs comments/likes back to the website in real-time. This guide walks you through the complete setup process.

## Features

✅ **Automatic Posting** - New recipes posted to Instagram with formatted captions
✅ **Comment Sync** - Instagram comments appear on the website with Instagram badge
✅ **Like Tracking** - Instagram likes displayed alongside recipe stats
✅ **Real-time Webhooks** - Instant notifications when users interact on Instagram
✅ **Two-way Engagement** - Reply to Instagram comments from the website

---

## Prerequisites

Before you begin, ensure you have:

1. **Instagram Business or Creator Account** (not a personal account)
2. **Facebook Page** connected to your Instagram account
3. **Facebook Developer Account** with admin access to that Page
4. **Public recipe images** (Instagram requires publicly accessible URLs)

---

## Step 1: Facebook App Setup

### 1.1 Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Choose **"Business"** as app type
4. Fill in details:
   - **App Name**: BanosCookbook
   - **Contact Email**: your-email@example.com
5. Click **"Create App"**

### 1.2 Add Instagram Product

1. In your app dashboard, go to **"Add Products"**
2. Find **"Instagram"** and click **"Set Up"**
3. Complete the Instagram product setup

### 1.3 Get Your Credentials

**App ID & Secret:**
1. Go to **Settings → Basic**
2. Copy **App ID**: `2199956927151415`
3. Copy **App Secret**: (keep this secret!)
4. Copy **Instagram App ID**: `1351073223206336`

---

## Step 2: Get Instagram Business Account ID

### 2.1 Generate Access Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Select your app from the dropdown
3. Click **"Generate Access Token"**
4. Grant these permissions:
   - `instagram_basic`
   - `pages_show_list`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `instagram_manage_comments`
5. Click **"Generate"** and copy the token

### 2.2 Get Your Facebook Page ID

Run this command (replace `YOUR_ACCESS_TOKEN`):

```bash
curl "https://graph.facebook.com/v24.0/me/accounts?access_token=YOUR_ACCESS_TOKEN"
```

Response will include your Facebook Page(s):
```json
{
  "data": [
    {
      "id": "134895793791914",
      "name": "BanosCookbook Page"
    }
  ]
}
```

Copy the **Page ID**.

### 2.3 Get Instagram Business Account ID

Run this command (replace `YOUR_PAGE_ID` and `YOUR_ACCESS_TOKEN`):

```bash
curl "https://graph.facebook.com/v24.0/YOUR_PAGE_ID?fields=instagram_business_account&access_token=YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "instagram_business_account": {
    "id": "17841405822304914"
  }
}
```

Copy the **Instagram Business Account ID**.

---

## Step 3: Configure Environment Variables

### 3.1 Update `.env.local`

Add these to your `.env.local` file:

```bash
# Instagram API Configuration
FACEBOOK_APP_ID=2199956927151415
FACEBOOK_APP_SECRET=your_app_secret_here
INSTAGRAM_APP_ID=1351073223206336
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
INSTAGRAM_ACCESS_TOKEN=your_access_token_here
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=create_a_random_string
```

**Important:**
- Never commit `.env.local` to version control
- The `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` can be any random string (e.g., `mySecureToken123`)

### 3.2 Get Long-Lived Access Token (Optional but Recommended)

Short-lived tokens expire in 1 hour. Convert to long-lived (60 days):

```bash
curl "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

Update `INSTAGRAM_ACCESS_TOKEN` with the new long-lived token.

---

## Step 4: Test Integration

### 4.1 Run Setup Helper

```bash
npm run instagram:setup
```

This displays your current configuration and provides setup instructions.

### 4.2 Test API Connection

```bash
npm run instagram:test
```

Expected output:
```
✅ Configuration loaded
✅ Access token available
✅ API connection successful
   Instagram Username: @banoscookbook
   Total Posts: 42

✅ Instagram API Integration Test: PASSED
```

---

## Step 5: Configure Webhooks (Real-time Updates)

### 5.1 Set Up Webhook in Facebook Dashboard

1. Go to your app → **Products → Webhooks**
2. Click **"Add Subscription"** for Instagram
3. Fill in:
   - **Callback URL**: `https://your-domain.com/api/webhooks/instagram`
   - **Verify Token**: (the value of `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to these fields:
   - `comments`
   - `mentions`
5. Click **"Verify and Save"**

### 5.2 Test Webhook Locally (Development)

For local testing, use a tunnel service like ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, create tunnel
ngrok http 9002
```

Use the ngrok URL as your webhook callback URL.

---

## Step 6: Usage

### 6.1 Automatic Posting

Recipes are automatically posted to Instagram when created. The system:

1. Uses the selected AI-generated image
2. Creates a formatted caption with:
   - Recipe title
   - Description
   - Prep/cook times
   - Servings
   - Relevant hashtags
   - Link back to recipe
3. Posts to your Instagram Business account
4. Saves the Instagram post ID in Firestore

### 6.2 Comment Syncing

Comments from Instagram are synced automatically via webhooks. Manual sync:

```typescript
// In any Server Action or API route
import { syncInstagramComments } from '@/app/actions';

await syncInstagramComments(recipeId);
```

### 6.3 View Instagram Data

Get Instagram post info for a recipe:

```typescript
import { getInstagramPostInfo } from '@/app/actions';

const result = await getInstagramPostInfo(recipeId);
// Returns: permalink, likeCount, commentsCount, postedAt
```

---

## Step 7: App Review (Production)

For production use, submit your app for review:

### 7.1 Required Permissions

Request these permissions in App Review:
- `instagram_basic` - Read basic profile info
- `instagram_content_publish` - Publish content
- `instagram_manage_comments` - Read/moderate comments
- `pages_show_list` - Access connected Pages

### 7.2 Submission Checklist

- [ ] App Privacy Policy URL added
- [ ] Terms of Service URL added
- [ ] App icon uploaded (1024x1024)
- [ ] Screen recording of Instagram features
- [ ] Detailed use case description

### 7.3 Review Timeline

- **Typical**: 3-5 business days
- **Status**: Check in App Dashboard → App Review

---

## Firestore Data Structure

### `instagram_posts` Collection

```typescript
{
  id: string;
  recipeId: string;
  instagramMediaId: string;
  instagramPermalink: string;
  postedAt: Date;
  caption: string;
  likeCount: number;
  commentsCount: number;
  lastSyncedAt: Date;
}
```

### Updated `recipes.comments` Array

Comments synced from Instagram include:
```typescript
{
  id: string;
  author: string;
  text: string;
  timestamp: string;
  likes: number;
  isFromInstagram: true;
  instagramCommentId: string;
  instagramUsername: string;
}
```

---

## Troubleshooting

### Issue: "Instagram API not configured"

**Solution:**
1. Check all environment variables are set in `.env.local`
2. Run `npm run instagram:test` to diagnose
3. Ensure variables don't have extra quotes or spaces

### Issue: "Invalid access token"

**Solution:**
1. Token may have expired (short-lived tokens expire in 1 hour)
2. Generate a new access token from Graph API Explorer
3. Convert to long-lived token for 60-day validity

### Issue: "Webhook verification failed"

**Solution:**
1. Ensure `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` matches exactly
2. Check webhook URL is publicly accessible
3. Verify your dev server is running on the correct port

### Issue: "Cannot post to Instagram - image must be public"

**Solution:**
1. Recipe images must be hosted on a public URL
2. Data URIs (base64) won't work - images must be uploaded to Firebase Storage first
3. Check image URL in browser to ensure it's accessible

### Issue: Comments not syncing

**Solution:**
1. Check webhooks are configured correctly
2. Verify webhook is receiving POST requests (check server logs)
3. Manually sync: `await syncInstagramComments(recipeId)`

---

## Rate Limits

Instagram API has the following limits:

- **200 calls per hour** per user
- **4800 calls per day** per app
- **Posts**: 25 per day per account

The system automatically handles rate limiting with retries.

---

## Security Best Practices

1. **Never commit secrets** - Keep `.env.local` out of version control
2. **Rotate tokens regularly** - Set up auto-refresh for long-lived tokens
3. **Use HTTPS** - All API calls must use HTTPS
4. **Validate webhooks** - Always verify webhook signatures
5. **Monitor usage** - Check API usage in Facebook Developer Dashboard

---

## Next Steps

- [x] Complete Instagram API setup
- [ ] Test posting a recipe
- [ ] Verify comments sync back to website
- [ ] Set up automatic token refresh
- [ ] Submit app for review (production)
- [ ] Monitor Instagram engagement metrics

---

## Resources

- [Instagram API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer)
- [Webhook Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks)
- [Content Publishing Guide](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)

---

## Support

For issues or questions:
1. Check [Instagram API Support](https://developers.facebook.com/support/instagram-api)
2. Review server logs for error messages
3. Test connection with `npm run instagram:test`

---

**Last Updated**: October 11, 2025
**Version**: 1.0
