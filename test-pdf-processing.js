const fs = require('fs');
const path = require('path');

// Test script to process MonAsal (Bana).pdf with our advanced PDF processing
async function testPDFProcessing() {
  try {
    console.log('🧪 Testing Advanced PDF Processing with MonAsal (Bana).pdf');
    console.log('=' .repeat(60));
    
    // Read the PDF file
    const pdfPath = path.join(__dirname, 'MonAsal (Bana).pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }
    
    console.log('📄 PDF file found:', pdfPath);
    console.log('📊 File size:', (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2), 'MB');
    
    // Convert to base64 data URI
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Data = pdfBuffer.toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64Data}`;
    
    console.log('✅ PDF converted to data URI');
    console.log('📏 Data URI length:', pdfDataUri.length);
    
    // Test different processing modes
    const processingModes = [
      { mode: 'auto', description: 'AI Auto-Detection' },
      { mode: 'text-only', description: 'Text Extraction Only' },
      { mode: 'ocr-only', description: 'OCR Processing Only' },
      { mode: 'hybrid', description: 'Hybrid Text + OCR' }
    ];
    
    console.log('\n🚀 Testing Processing Modes:');
    console.log('-'.repeat(40));
    
    for (const { mode, description } of processingModes) {
      console.log(`\n🔍 Testing ${description} (${mode})...`);
      
      try {
        // Import the advanced processing function
        const { extractRecipesFromPdfAdvanced } = require('./src/ai/flows/recipes-from-pdf-advanced.ts');
        
        const startTime = Date.now();
        
        const result = await extractRecipesFromPdfAdvanced({
          pdfDataUri,
          processingMode: mode,
          ocrLanguage: 'eng',
          imageQuality: 'high',
          enableAIEnhancement: true
        });
        
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ ${description} completed in ${processingTime}ms`);
        console.log(`📊 Processing Info:`, {
          totalPages: result.processingInfo.totalPages,
          textExtracted: result.processingInfo.textExtracted,
          imagesProcessed: result.processingInfo.imagesProcessed,
          ocrAccuracy: result.processingInfo.ocrAccuracy,
          aiEnhanced: result.processingInfo.aiEnhanced
        });
        
        console.log(`🍽️  Recipes Found: ${result.recipes.length}`);
        
        if (result.recipes.length > 0) {
          console.log('📝 Sample Recipe:');
          const sampleRecipe = result.recipes[0];
          console.log(`   Title: ${sampleRecipe.title}`);
          console.log(`   Cuisine: ${sampleRecipe.cuisine}`);
          console.log(`   Servings: ${sampleRecipe.servings}`);
          console.log(`   Prep Time: ${sampleRecipe.prepTime}`);
          console.log(`   Cook Time: ${sampleRecipe.cookTime}`);
          console.log(`   Ingredients: ${sampleRecipe.ingredients.substring(0, 100)}...`);
        }
        
        if (result.rawText) {
          console.log(`📄 Raw Text Length: ${result.rawText.length} characters`);
          console.log(`📄 Text Preview: ${result.rawText.substring(0, 200)}...`);
        }
        
      } catch (error) {
        console.error(`❌ Error with ${description}:`, error.message);
      }
    }
    
    console.log('\n🎉 PDF Processing Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPDFProcessing();
