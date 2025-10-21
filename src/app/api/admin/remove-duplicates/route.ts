import { removeDuplicateRecipesAction } from '@/app/actions';
import { NextResponse } from 'next/server';

/**
 * API endpoint to remove duplicate recipes from the database
 * GET /api/admin/remove-duplicates
 */
export async function GET() {
  try {
    console.log('🔧 Admin: Remove duplicates API called');

    const result = await removeDuplicateRecipesAction();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully removed ${result.removed} duplicate recipe(s)`,
        removed: result.removed,
        duplicates: result.duplicates
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in remove-duplicates API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST method for programmatic access
 */
export async function POST() {
  return GET();
}
