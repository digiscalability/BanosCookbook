const fs = require('fs');
const path = require('path');

// Manual test script for MonAsal (Bana).pdf
async function testManualPDF() {
  try {
    console.log('🧪 Manual PDF Processing Test');
    console.log('=' .repeat(50));
    
    // Check if the PDF file exists
    const pdfPath = path.join(__dirname, 'MonAsal (Bana).pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      console.log('Available files in directory:');
      const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.pdf'));
      files.forEach(f => console.log('  -', f));
      return;
    }
    
    console.log('📄 PDF file found:', pdfPath);
    const stats = fs.statSync(pdfPath);
    console.log('📊 File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('📅 Last modified:', stats.mtime);
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('✅ PDF file read successfully');
    console.log('📏 Buffer size:', pdfBuffer.length, 'bytes');
    
    // Convert to base64 data URI
    const base64Data = pdfBuffer.toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64Data}`;
    
    console.log('✅ PDF converted to data URI');
    console.log('📏 Data URI length:', pdfDataUri.length);
    
    // Test basic PDF parsing
    console.log('\n🔍 Testing basic PDF parsing...');
    
    try {
      const pdfjs = require('pdf-parse');
      const data = await pdfjs(pdfBuffer);
      
      console.log('✅ PDF parsing successful');
      console.log('📄 Pages:', data.numpages);
      console.log('📝 Text length:', data.text.length);
      console.log('📝 Text preview:', data.text.substring(0, 200) + '...');
      
      // Check for recipe indicators
      const text = data.text.toLowerCase();
      const recipeIndicators = [
        'ingredients', 'instructions', 'prep time', 'cook time', 'servings',
        'cups', 'tablespoons', 'teaspoons', 'degrees', 'minutes', 'hours',
        'recipe', 'cooking', 'baking', 'frying', 'boiling'
      ];
      
      const foundIndicators = recipeIndicators.filter(indicator => 
        text.includes(indicator)
      );
      
      console.log('🍽️  Recipe indicators found:', foundIndicators.length, 'out of', recipeIndicators.length);
      console.log('📋 Found indicators:', foundIndicators);
      
      if (data.text.length > 100) {
        console.log('✅ PDF has substantial text content - good for text extraction');
      } else {
        console.log('⚠️  PDF has minimal text - may need OCR processing');
      }
      
    } catch (parseError) {
      console.error('❌ PDF parsing failed:', parseError.message);
      console.log('💡 This PDF may be image-based or corrupted');
    }
    
    console.log('\n🎯 Recommendations:');
    console.log('1. If text extraction worked: Use "text-only" or "hybrid" mode');
    console.log('2. If text extraction failed: Use "ocr-only" mode (requires GraphicsMagick)');
    console.log('3. For best results: Use "auto" mode to let AI choose');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testManualPDF();
