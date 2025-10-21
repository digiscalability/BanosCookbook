import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required environment variables are present
    const hasApiKey = !!process.env.GOOGLE_API_KEY;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        googleAI: hasApiKey ? 'configured' : 'missing'
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
