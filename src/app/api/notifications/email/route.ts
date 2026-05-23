import { NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { to, type, recipeTitle, recipeUrl, authorName, commentText, replyText } = body as {
      to?: string;
      type?: 'new_comment' | 'new_reply' | 'new_like';
      recipeTitle?: string;
      recipeUrl?: string;
      authorName?: string;
      commentText?: string;
      replyText?: string;
    };

    if (!to || !type || !recipeTitle || !recipeUrl || !authorName) {
      return NextResponse.json(
        { error: 'Missing required fields: to, type, recipeTitle, recipeUrl, authorName' },
        { status: 400 }
      );
    }

    const validTypes = ['new_comment', 'new_reply', 'new_like'] as const;
    if (!validTypes.includes(type as (typeof validTypes)[number])) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    await sendEmail({ to, type, recipeTitle, recipeUrl, authorName, commentText, replyText });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[email/route] Failed to send email:', error);
    return NextResponse.json({ error: 'Failed to send email notification.' }, { status: 500 });
  }
}
