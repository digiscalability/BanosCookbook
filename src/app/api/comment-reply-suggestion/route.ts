import { NextRequest, NextResponse } from 'next/server';
import { commentReplySuggestion } from '@/ai/flows/comment-reply-suggestion';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipeTitle, recipeDescription, comment } = body as {
      recipeTitle?: string;
      recipeDescription?: string;
      comment?: string;
    };

    if (!recipeTitle || !comment) {
      return NextResponse.json(
        { error: 'recipeTitle and comment are required' },
        { status: 400 }
      );
    }

    const result = await commentReplySuggestion({
      recipeTitle,
      recipeDescription: recipeDescription ?? '',
      comment,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[comment-reply-suggestion]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
