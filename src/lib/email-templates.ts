/**
 * Email Template Generator
 * Helper functions to generate email HTML templates for notifications
 */

export function generateEmailHTML(data: {
  type: 'new_comment' | 'new_reply' | 'new_like';
  recipeTitle: string;
  recipeUrl: string;
  authorName: string;
  commentText?: string;
  replyText?: string;
}): { subject: string; html: string; text: string } {
  const { type, recipeTitle, recipeUrl, authorName, commentText, replyText } = data;

  let subject = '';
  let html = '';
  let text = '';

  // Resolve app base URL safely:
  // - Prefer explicit NEXT_PUBLIC_APP_URL
  // - In production prefer VERCEL_URL (auto-set by Vercel) if NEXT_PUBLIC_APP_URL is not provided
  // - Only use localhost when running in development
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && process.env.NODE_ENV === 'production') {
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // Do not default to localhost in production; fall back to empty so we return a relative URL
      baseUrl = '';
    }
  }
  if (!baseUrl && process.env.NODE_ENV !== 'production') {
    baseUrl = 'http://localhost:9002';
  }

  // Build fullUrl. If baseUrl is empty, use the recipeUrl as-is (it should be an absolute or relative path).
  const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${recipeUrl}` : recipeUrl;

  switch (type) {
    case 'new_comment':
      subject = `New comment on your recipe: ${recipeTitle}`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .comment { background: white; padding: 15px; border-left: 4px solid #f97316; margin: 15px 0; }
              .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px;
                       text-decoration: none; border-radius: 6px; margin-top: 15px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🍳 BanosCookbook</h1>
              </div>
              <div class="content">
                <h2>New Comment on Your Recipe</h2>
                <p><strong>${authorName}</strong> left a comment on your recipe <strong>${recipeTitle}</strong>:</p>
                <div class="comment">
                  <p>${commentText}</p>
                </div>
                <a href="${fullUrl}" class="button">View Comment</a>
              </div>
              <div class="footer">
                <p>You're receiving this because someone commented on your recipe.</p>
                <p>BanosCookbook - Share the love of cooking! 🍴</p>
              </div>
            </div>
          </body>
        </html>
      `;
      text = `New comment on your recipe: ${recipeTitle}\n\n${authorName} wrote:\n${commentText}\n\nView: ${fullUrl}`;
      break;

    case 'new_reply':
      subject = `New reply to your comment on: ${recipeTitle}`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .reply { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
              .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px;
                       text-decoration: none; border-radius: 6px; margin-top: 15px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🍳 BanosCookbook</h1>
              </div>
              <div class="content">
                <h2>New Reply to Your Comment</h2>
                <p><strong>${authorName}</strong> replied to your comment on <strong>${recipeTitle}</strong>:</p>
                <div class="reply">
                  <p>${replyText}</p>
                </div>
                <a href="${fullUrl}" class="button">View Reply</a>
              </div>
              <div class="footer">
                <p>You're receiving this because someone replied to your comment.</p>
                <p>BanosCookbook - Share the love of cooking! 🍴</p>
              </div>
            </div>
          </body>
        </html>
      `;
      text = `New reply to your comment on: ${recipeTitle}\n\n${authorName} replied:\n${replyText}\n\nView: ${fullUrl}`;
      break;

    case 'new_like':
      subject = `Someone liked your comment on: ${recipeTitle}`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; }
              .like-icon { font-size: 48px; margin: 20px 0; }
              .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px;
                       text-decoration: none; border-radius: 6px; margin-top: 15px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🍳 BanosCookbook</h1>
              </div>
              <div class="content">
                <div class="like-icon">❤️</div>
                <h2>Someone Liked Your Comment!</h2>
                <p><strong>${authorName}</strong> liked your comment on <strong>${recipeTitle}</strong>.</p>
                <a href="${fullUrl}" class="button">View Recipe</a>
              </div>
              <div class="footer">
                <p>You're receiving this because someone appreciated your comment.</p>
                <p>BanosCookbook - Share the love of cooking! 🍴</p>
              </div>
            </div>
          </body>
        </html>
      `;
      text = `${authorName} liked your comment on: ${recipeTitle}\n\nView: ${fullUrl}`;
      break;

    default:
      subject = `Notification from BanosCookbook`;
      html = `<p>You have a new notification from BanosCookbook.</p>`;
      text = `You have a new notification from BanosCookbook.`;
  }

  return { subject, html, text };
}
