import { generateEmailHTML } from './email-templates';

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailPayload {
  to: string;
  type: 'new_comment' | 'new_reply' | 'new_like';
  recipeTitle: string;
  recipeUrl: string;
  authorName: string;
  commentText?: string;
  replyText?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL ?? 'notifications@banoscookbook.com';

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return;
  }

  const { subject, html, text } = generateEmailHTML({
    type: payload.type,
    recipeTitle: payload.recipeTitle,
    recipeUrl: payload.recipeUrl,
    authorName: payload.authorName,
    commentText: payload.commentText,
    replyText: payload.replyText,
  });

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}
