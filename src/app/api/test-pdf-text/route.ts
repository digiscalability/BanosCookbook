import { NextRequest, NextResponse } from 'next/server';
import * as pdfjs from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const { pdfDataUri } = await request.json();
    
    if (!pdfDataUri) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 });
    }

    // Extract base64 data from data URI
    const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    console.log('Testing PDF text extraction...');
    console.log('PDF buffer size:', pdfBuffer.length);

    let textResult;
    let success = false;
    let error = null;

    try {
      // Try basic text extraction
      textResult = await pdfjs.default(pdfBuffer);
      success = true;
    } catch (parseError) {
      console.warn('PDF parsing failed:', parseError);
      error = parseError instanceof Error ? parseError.message : String(parseError);
      
      // Try with different options
      try {
        textResult = await pdfjs.default(pdfBuffer, { max: 0 });
        success = true;
        error = null;
      } catch (fallbackError) {
        console.warn('Fallback parsing also failed:', fallbackError);
        textResult = { text: '', numpages: 0 };
      }
    }

    const response = {
      success,
      error,
      pages: textResult?.numpages || 0,
      textLength: textResult?.text?.length || 0,
      textPreview: textResult?.text?.substring(0, 200) || '',
      hasText: (textResult?.text?.length || 0) > 100,
      isImagePDF: (textResult?.text?.length || 0) < 100,
    };

    console.log('PDF analysis result:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
