import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'Found' : 'Missing',
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY ? 'Found' : 'Missing',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Found' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    hasApiKey: !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY)
  };

  console.log('Environment check:', envCheck);

  return NextResponse.json(envCheck);
}
