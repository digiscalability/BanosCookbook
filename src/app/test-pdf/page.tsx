'use client';

import {
  AlertCircle,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  Image,
  TestTube,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

import { extractRecipeDataFromPdfAdvanced } from '@/app/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function TestPDFPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  type TestResult = {
    mode: 'auto' | 'text-only' | 'ocr-only' | 'hybrid';
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
      recipes: Array<{
        title: string;
        cuisine?: string;
        servings?: number;
        prepTime?: string;
        cookTime?: string;
      }>;
      rawText?: string;
    };
    error?: string;
    timestamp: string;
  };

  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const testModes: Array<{
    mode: 'auto' | 'text-only' | 'ocr-only' | 'hybrid';
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }> = [
    { mode: 'auto', description: 'AI Auto-Detection', icon: Brain },
    { mode: 'text-only', description: 'Text Extraction Only', icon: FileText },
    { mode: 'ocr-only', description: 'OCR Processing Only', icon: Image },
    { mode: 'hybrid', description: 'Hybrid Text + OCR', icon: Zap },
  ];

  const processPDF = async (
    mode: 'auto' | 'text-only' | 'ocr-only' | 'hybrid',
    description: string
  ) => {
    setIsProcessing(true);
    setCurrentTest(description);
    setProcessingProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      // For testing, we'll use a sample PDF data URI
      // In a real scenario, you would upload the MonAsal (Bana).pdf file
      const samplePDFDataUri =
        'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoyNTAgNzAwIFRkCihUZXN0IFBERiBGaWxlKSBUagoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDI2MiAwMDAwMCBuCjAwMDAwMDAzNDEgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQzNQolJUVPRgo=';

      const result = await extractRecipeDataFromPdfAdvanced(samplePDFDataUri, {
        processingMode: mode,
        ocrLanguage: 'eng',
        imageQuality: 'high',
        enableAIEnhancement: true,
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (result.success && result.data) {
        setResults(prev => [
          ...prev,
          {
            mode,
            description,
            result: result.data,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setResults(prev => [
          ...prev,
          {
            mode,
            description,
            error: result.error,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      setResults(prev => [
        ...prev,
        {
          mode,
          description,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    for (const { mode, description } of testModes) {
      await processPDF(mode, description);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            PDF Processing Test Suite
          </CardTitle>
          <CardDescription>
            Test the advanced PDF processing system with MonAsal (Bana).pdf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Controls */}
          <div className="flex gap-4">
            <Button onClick={runAllTests} disabled={isProcessing}>
              Run All Tests
            </Button>
            <Button variant="outline" onClick={() => setResults([])} disabled={isProcessing}>
              Clear Results
            </Button>
          </div>

          {/* Individual Test Buttons */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {testModes.map(({ mode, description, icon: Icon }) => (
              <Button
                key={mode}
                variant="outline"
                onClick={() => processPDF(mode, description)}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                Test {description}
              </Button>
            ))}
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
                        <AlertDescription>Error: {result.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {result.result && (
                          <>
                            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                              <div>
                                <strong>Pages:</strong> {result.result.processingInfo.totalPages}
                              </div>
                              <div>
                                <strong>Text Extracted:</strong>{' '}
                                {result.result.processingInfo.textExtracted ? 'Yes' : 'No'}
                              </div>
                              <div>
                                <strong>Images Processed:</strong>{' '}
                                {result.result.processingInfo.imagesProcessed}
                              </div>
                              <div>
                                <strong>Processing Time:</strong>{' '}
                                {result.result.processingInfo.processingTime}ms
                              </div>
                            </div>

                            {typeof result.result.processingInfo.ocrAccuracy === 'number' && (
                              <div className="text-sm">
                                <strong>OCR Accuracy:</strong>{' '}
                                {Math.round(result.result.processingInfo.ocrAccuracy * 100)}%
                              </div>
                            )}

                            {result.result.processingInfo.aiEnhanced && (
                              <div className="flex items-center gap-1 text-sm text-green-600">
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
                                <div className="rounded-md bg-gray-50 p-3">
                                  <div>
                                    <strong>Title:</strong> {result.result.recipes[0].title}
                                  </div>
                                  <div>
                                    <strong>Cuisine:</strong> {result.result.recipes[0].cuisine}
                                  </div>
                                  <div>
                                    <strong>Servings:</strong> {result.result.recipes[0].servings}
                                  </div>
                                  <div>
                                    <strong>Prep Time:</strong> {result.result.recipes[0].prepTime}
                                  </div>
                                  <div>
                                    <strong>Cook Time:</strong> {result.result.recipes[0].cookTime}
                                  </div>
                                </div>
                              </div>
                            )}

                            {result.result.rawText && (
                              <div>
                                <strong>Raw Text Preview:</strong>
                                <div className="max-h-32 overflow-y-auto rounded-md bg-gray-50 p-3 text-xs">
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
        </CardContent>
      </Card>
    </div>
  );
}
