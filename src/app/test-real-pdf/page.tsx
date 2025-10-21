'use client';

import { extractRecipeDataFromPdfAdvanced } from '@/app/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    AlertCircle,
    Brain,
    CheckCircle,
    Clock,
    TestTube,
    Upload
} from 'lucide-react';
import React, { useState } from 'react';

export default function TestRealPDFPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  type RealResult = {
    mode: string;
    description: string;
    result?: {
      processingInfo: {
        totalPages: number;
        textExtracted: boolean;
        imagesProcessed: number;
        processingTime: number;
        ocrAccuracy?: number;
        aiEnhanced?: boolean;
      };
      recipes: Array<{ title: string; cuisine?: string; servings?: number; prepTime?: string; cookTime?: string; ingredients?: string; }>;
      rawText?: string;
    };
    error?: string;
    timestamp: string;
  };

  const [results, setResults] = useState<RealResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const processPDF = async (file: File, mode: 'auto'|'text-only'|'ocr-only'|'hybrid', description: string) => {
    setIsProcessing(true);
    setCurrentTest(description);
    setProcessingProgress(0);

    try {
      // Convert file to data URI
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfDataUri = e.target?.result as string;

        if (!pdfDataUri) {
          setResults(prev => [...prev, {
            mode,
            description,
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
          const result = await extractRecipeDataFromPdfAdvanced(pdfDataUri, {
            processingMode: mode,
            ocrLanguage: 'eng',
            imageQuality: 'high',
            enableAIEnhancement: true,
          });

          clearInterval(progressInterval);
          setProcessingProgress(100);

          if (result.success && result.data) {
            setResults(prev => [...prev, {
              mode,
              description,
              result: result.data,
              timestamp: new Date().toISOString()
            }]);
          } else {
            setResults(prev => [...prev, {
              mode,
              description,
              error: result.error,
              timestamp: new Date().toISOString()
            }]);
          }
        } catch (error) {
          clearInterval(progressInterval);
          setResults(prev => [...prev, {
            mode,
            description,
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
        mode,
        description,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      // Test with different modes
      const modes: Array<{mode: 'auto'|'text-only'|'ocr-only'|'hybrid'; description: string}> = [
        { mode: 'auto', description: 'AI Auto-Detection' },
        { mode: 'text-only', description: 'Text Extraction Only' },
        { mode: 'ocr-only', description: 'OCR Processing Only' },
        { mode: 'hybrid', description: 'Hybrid Text + OCR' }
      ];

      setResults([]);
      modes.forEach(({ mode, description }, index) => {
        setTimeout(() => {
          processPDF(file, mode, description);
        }, index * 2000); // Stagger the tests
      });
    } else {
      setResults(prev => [...prev, {
        mode: 'error',
        description: 'Invalid File',
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
            Real PDF Processing Test
          </CardTitle>
          <CardDescription>
            Test the advanced PDF processing system with your actual MonAsal (Bana).pdf file
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
                    <span>Testing {currentTest}...</span>
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
              <h3 className="text-lg font-semibold">Test Results</h3>
              {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {result.error ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {result.description}
                      <Badge variant="secondary">{result.mode}</Badge>
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
                        {result.result && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <strong>Pages:</strong> {result.result.processingInfo.totalPages}
                              </div>
                              <div>
                                <strong>Text Extracted:</strong> {result.result.processingInfo.textExtracted ? 'Yes' : 'No'}
                              </div>
                              <div>
                                <strong>Images Processed:</strong> {result.result.processingInfo.imagesProcessed}
                              </div>
                              <div>
                                <strong>Processing Time:</strong> {result.result.processingInfo.processingTime}ms
                              </div>
                            </div>

                            {typeof result.result.processingInfo.ocrAccuracy === 'number' && (
                              <div className="text-sm">
                                <strong>OCR Accuracy:</strong> {Math.round(result.result.processingInfo.ocrAccuracy * 100)}%
                              </div>
                            )}

                            {result.result.processingInfo.aiEnhanced && (
                              <div className="text-sm text-green-600 flex items-center gap-1">
                                <Brain className="h-3 w-3" />
                                AI Enhancement Applied
                              </div>
                            )}

                            <div>
                              <strong>Recipes Found:</strong> {result.result.recipes.length}
                            </div>

                            {result.result.recipes.length > 0 && (
                              <div className="space-y-2">
                                <strong>Sample Recipe:</strong>
                                <div className="p-3 bg-gray-50 rounded-md">
                                  <div><strong>Title:</strong> {result.result.recipes[0].title}</div>
                                  <div><strong>Cuisine:</strong> {result.result.recipes[0].cuisine}</div>
                                  <div><strong>Servings:</strong> {result.result.recipes[0].servings}</div>
                                  <div><strong>Prep Time:</strong> {result.result.recipes[0].prepTime}</div>
                                  <div><strong>Cook Time:</strong> {result.result.recipes[0].cookTime}</div>
                                  <div><strong>Ingredients:</strong></div>
                                  <div className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                                    {result.result.recipes[0].ingredients}
                                  </div>
                                </div>
                              </div>
                            )}

                            {result.result.rawText && (
                              <div>
                                <strong>Raw Text Preview:</strong>
                                <div className="p-3 bg-gray-50 rounded-md text-xs max-h-32 overflow-y-auto">
                                  {result.result.rawText.substring(0, 500)}...
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Upload your MonAsal (Bana).pdf file using the file input above</li>
                  <li>The system will automatically test all processing modes</li>
                  <li>Compare the results to see which method works best for your PDF</li>
                  <li>Check the Recipes Found count and sample recipe quality</li>
                  <li>Look at the raw text preview to see what was extracted</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
