'use client';

import { extractRecipesFromPdfFallback } from '@/ai/flows/recipes-from-pdf-fallback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Download,
    ExternalLink,
    Lightbulb,
    TestTube,
    Upload
} from 'lucide-react';
import React, { useState } from 'react';

export default function TestFallbackPDFPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  type RecipePreview = {
    title: string;
    cuisine?: string;
    servings?: number;
    prepTime?: string;
    cookTime?: string;
    ingredients?: string;
    instructions?: string;
  };

  type FallbackResult = {
    test: string;
    result?: {
      processingInfo?: {
        totalPages?: number;
        textExtracted?: boolean;
        textLength?: number;
        isImagePDF?: boolean;
        processingTime?: number;
        recommendations?: string[];
      };
      recipes?: RecipePreview[];
      rawText?: string;
    };
    error?: string;
    timestamp: string;
  };

  const [results, setResults] = useState<FallbackResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const processPDF = async (file: File) => {
    setIsProcessing(true);
    setCurrentTest('Processing PDF with fallback method...');
    setProcessingProgress(0);

    try {
      // Convert file to data URI
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfDataUri = e.target?.result as string;

        if (!pdfDataUri) {
          setResults(prev => [...prev, {
            test: 'PDF Processing',
            error: 'Failed to read PDF file',
            timestamp: new Date().toISOString()
          }]);
          setIsProcessing(false);
          return;
        }

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProcessingProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 10;
          });
        }, 500);

        try {
          const result = await extractRecipesFromPdfFallback({
            pdfDataUri,
          });

          clearInterval(progressInterval);
          setProcessingProgress(100);

          setResults(prev => [...prev, {
            test: 'Fallback PDF Processing',
            result: result,
            timestamp: new Date().toISOString()
          }]);

        } catch (error) {
          clearInterval(progressInterval);
          setResults(prev => [...prev, {
            test: 'PDF Processing',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }]);
        } finally {
          setIsProcessing(false);
          setProcessingProgress(0);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setIsProcessing(false);
      setResults(prev => [...prev, {
        test: 'PDF Processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResults([]);
      processPDF(file);
    } else {
      setResults(prev => [...prev, {
        test: 'File Validation',
        error: 'Please select a valid PDF file',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Fallback PDF Processing
          </CardTitle>
          <CardDescription>
            Process your MonAsal (Bana).pdf with fallback methods and get detailed recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label htmlFor="pdf-upload" className="block text-sm font-medium">
              Upload MonAsal (Bana).pdf
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{currentTest}</span>
                    <span>{Math.round(processingProgress)}%</span>
                  </div>
                  <Progress value={processingProgress} className="w-full" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Processing Results</h3>
              {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {result.error ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {result.test}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Error: {result.error}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {/* Processing Info */}
                        {result.result?.processingInfo && (
                          <div>
                            <strong>Processing Information:</strong>
                            <div className="p-3 bg-gray-50 rounded-md text-sm">
                              <div>Pages: {result.result.processingInfo.totalPages}</div>
                              <div>Text Extracted: {result.result.processingInfo.textExtracted ? 'Yes' : 'No'}</div>
                              <div>Text Length: {result.result.processingInfo.textLength} characters</div>
                              <div>Is Image PDF: {result.result.processingInfo.isImagePDF ? 'Yes' : 'No'}</div>
                              <div>Processing Time: {result.result.processingInfo.processingTime}ms</div>
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {result.result?.processingInfo?.recommendations && (
                          <div>
                            <strong>Recommendations:</strong>
                            <div className="space-y-2">
                              {result.result.processingInfo.recommendations.map((rec, idx) => (
                                <Alert key={idx}>
                                  <Lightbulb className="h-4 w-4" />
                                  <AlertDescription>{rec}</AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recipes Found */}
                        <div>
                          <strong>Recipes Found: {result.result?.recipes?.length || 0}</strong>
                          {result.result?.recipes && result.result.recipes.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {result.result.recipes.map((recipe: RecipePreview, idx: number) => (
                                <Card key={idx} className="p-3">
                                  <div className="space-y-1 text-sm">
                                    <div><strong>Title:</strong> {recipe.title}</div>
                                    <div><strong>Cuisine:</strong> {recipe.cuisine}</div>
                                    <div><strong>Servings:</strong> {recipe.servings}</div>
                                    <div><strong>Prep Time:</strong> {recipe.prepTime}</div>
                                    <div><strong>Cook Time:</strong> {recipe.cookTime}</div>
                                    <div><strong>Ingredients:</strong></div>
                                    <div className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                                      {recipe.ingredients}
                                    </div>
                                    <div><strong>Instructions:</strong></div>
                                    <div className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                                      {recipe.instructions}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Raw Text Preview */}
                        {result.result?.rawText && (
                          <div>
                            <strong>Raw Text Preview:</strong>
                            <div className="p-3 bg-gray-50 rounded-md text-xs max-h-32 overflow-y-auto">
                              {result.result.rawText.substring(0, 500)}...
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Alternative Solutions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Alternative Solutions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Option 1: Online OCR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Use online OCR services to convert your PDF to text
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Google Drive OCR
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        SmallPDF OCR
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        ILovePDF OCR
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Option 2: Desktop OCR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Use desktop applications for OCR processing
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Adobe Acrobat
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        ABBYY FineReader
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Tesseract OCR
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Upload your MonAsal (Bana).pdf file</li>
                  <li>The system will analyze the PDF and provide recommendations</li>
                  <li>If it is an image-based PDF, follow the alternative solutions above</li>
                  <li>Once you have a text-based PDF, you can use the regular processing tools</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
