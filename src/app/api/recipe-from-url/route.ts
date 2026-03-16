import { NextRequest, NextResponse } from 'next/server';
import { recipeFromUrl } from '@/ai/flows/recipe-from-url';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const result = await recipeFromUrl({ url });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[recipe-from-url]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract recipe from URL' },
      { status: 500 }
    );
  }
}
