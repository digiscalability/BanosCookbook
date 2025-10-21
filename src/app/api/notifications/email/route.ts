import { NextRequest, NextResponse } from 'next/server';
// Unused for now - will be used when email provider is integrated
// import { generateEmailHTML } from '@/lib/email-templates';

export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Send email notification
 * POST /api/notifications/email
 *
 * Note: This is a placeholder implementation. In production, you would integrate with:
 * - SendGrid
 * - AWS SES
 * - Resend
 * - Mailgun
 * - Or any other email service provider
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      to,
      subject,
      type, // 'new_comment', 'new_reply', 'new_like'
      recipeTitle,
      authorName,
    } = body as {
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
      type?: string;
      recipeTitle?: string;
      commentText?: string;
      authorName?: string;
    };

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Email recipient (to) and subject are required.' },
        { status: 400 }
      );
    }

    // Log the email (in production, send actual email)
    console.log('📧 Email Notification:', {
      to,
      subject,
      type,
      recipeTitle,
      authorName,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with email service provider
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    await sgMail.send({
      to,
      from: process.env.FROM_EMAIL,
      subject,
      text: text || '',
      html: html || text || '',
    });
    */

    // For now, just simulate success
    return NextResponse.json({
      success: true,
      message: 'Email notification logged (not sent - configure email provider)',
      details: {
        to,
        subject,
        type,
      },
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json(
      { error: 'Failed to send email notification.' },
      { status: 500 }
    );
  }
}
