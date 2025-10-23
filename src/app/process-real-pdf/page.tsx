'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  Lightbulb,
  TestTube,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function ProcessRealPDFPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  type TextExtraction = {
    pages?: number;
    textLength?: number;
    success?: boolean;
    textPreview?: string;
  };

  type Recommendation = {
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    solutions: string[];
  };

  type NextStep = {
    step: number;
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  };

  type Analysis = {
    fileInfo?: {
      fileName: string;
      fileSize: string;
      dataUriLength: number;
      isLargeFile: boolean;
      isImagePDF: boolean;
    };
    textExtraction?: TextExtraction;
    recommendations?: Recommendation[];
    nextSteps?: NextStep[];
  };

  const [results, setResults] = useState<
    Array<{ test?: string; result?: Analysis; error?: string; timestamp?: string }>
  >([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<{
    fileName: string;
    fileSize: string;
    dataUriLength: number;
    isLargeFile: boolean;
    isImagePDF: boolean;
  } | null>(null);

  const processPDF = async (file: File) => {
    setIsProcessing(true);
    setCurrentTest('Processing your MonAsal (Bana).pdf...');
    setProcessingProgress(0);

    try {
      // Convert file to data URI
      const reader = new FileReader();
      reader.onload = async e => {
        const pdfDataUri = e.target?.result as string;

        if (!pdfDataUri) {
          setResults(prev => [
            ...prev,
            {
              test: 'File Processing',
              error: 'Failed to read PDF file',
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsProcessing(false);
          return;
        }

        // Set file info
        setFileInfo({
          fileName: file.name,
          fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          dataUriLength: pdfDataUri.length,
          isLargeFile: file.size > 5 * 1024 * 1024,
          isImagePDF: pdfDataUri.length > 10000000,
        });

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProcessingProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 5;
          });
        }, 1000);

        try {
          // Test basic text extraction first
          setCurrentTest('Testing text extraction...');
          const textResponse = await fetch('/api/test-pdf-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfDataUri }),
          });

          const textResult = await textResponse.json();

          setCurrentTest('Analyzing PDF structure...');
          setProcessingProgress(50);

          // Analyze the results and provide recommendations
          // Coerce external results into our typed shapes
          const coercedTextExtraction = textResult as TextExtraction;
          const coercedRecommendations = (
            generateRecommendations(textResult, file.size) as unknown as Recommendation[]
          ).map(
            r =>
              ({
                type: r.type as 'warning' | 'info' | 'success',
                title: r.title,
                message: r.message,
                solutions: r.solutions,
              }) as Recommendation
          );

          const coercedNextSteps = (
            generateNextSteps(textResult, file.size) as unknown as NextStep[]
          ).map(
            s =>
              ({
                step: s.step,
                title: s.title,
                description: s.description,
                action: s.action,
                priority: s.priority as 'high' | 'medium' | 'low',
              }) as NextStep
          );

          const analysis: Analysis = {
            fileInfo: {
              fileName: file.name,
              fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
              dataUriLength: pdfDataUri.length,
              isLargeFile: file.size > 5 * 1024 * 1024,
              isImagePDF: pdfDataUri.length > 10000000,
            },
            textExtraction: coercedTextExtraction,
            recommendations: coercedRecommendations,
            nextSteps: coercedNextSteps,
          };

          clearInterval(progressInterval);
          setProcessingProgress(100);

          setResults(prev => [
            ...prev,
            {
              test: 'MonAsal (Bana).pdf Analysis',
              result: analysis,
              timestamp: new Date().toISOString(),
            },
          ]);
        } catch (error) {
          clearInterval(progressInterval);
          setResults(prev => [
            ...prev,
            {
              test: 'PDF Analysis',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
          ]);
        } finally {
          setIsProcessing(false);
          setProcessingProgress(0);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setIsProcessing(false);
      setResults(prev => [
        ...prev,
        {
          test: 'File Processing',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const generateRecommendations = (textResult: unknown, fileSize: number) => {
    const recommendations: Array<{
      type: 'warning' | 'info' | 'success';
      title: string;
      message: string;
      solutions: string[];
    }> = [];
    const tr = textResult as { textLength?: number } | undefined;

    if ((tr?.textLength ?? 0) < 100) {
      recommendations.push({
        type: 'warning',
        title: 'Image-Based PDF Detected',
        message:
          'Your MonAsal (Bana).pdf appears to be a scanned cookbook with no extractable text.',
        solutions: [
          'Use Google Drive OCR: Upload to Google Drive → Right-click → Open with Google Docs',
          'Use SmallPDF OCR: Visit smallpdf.com/ocr-pdf and upload your PDF',
          'Use Adobe Acrobat: Open PDF → Tools → Enhance Scans → OCR',
        ],
      });
    }

    if (fileSize > 10 * 1024 * 1024) {
      recommendations.push({
        type: 'info',
        title: 'Large File Detected',
        message: 'Your PDF is quite large, which may slow down processing.',
        solutions: [
          'Consider compressing the PDF before OCR processing',
          'Use online OCR services for better performance',
          'Process in smaller chunks if possible',
        ],
      });
    }

    if ((tr?.textLength ?? 0) > 100) {
      recommendations.push({
        type: 'success',
        title: 'Text Content Found',
        message: 'Your PDF contains extractable text.',
        solutions: [
          'Use the advanced processing system for recipe extraction',
          'Try text-only or hybrid processing modes',
          'AI enhancement should work well with this content',
        ],
      });
    }

    return recommendations;
  };

  const generateNextSteps = (textResult: unknown, fileSize: number) => {
    const steps: Array<{
      step: number;
      title: string;
      description: string;
      action: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    const tr = textResult as { textLength?: number } | undefined;

    if ((tr?.textLength ?? 0) < 100) {
      steps.push({
        step: 1,
        title: 'Convert PDF to Text',
        description: 'Use OCR to extract text from your scanned cookbook',
        action: 'Choose an OCR method from the recommendations above',
        priority: 'high',
      });

      steps.push({
        step: 2,
        title: 'Process with BanosCookbook',
        description: 'Once you have text content, use our advanced processing',
        action: 'Upload the OCR-processed PDF or text file',
        priority: 'medium',
      });
    } else {
      steps.push({
        step: 1,
        title: 'Use Advanced Processing',
        description: 'Your PDF has text content - use our advanced system',
        action: 'Go to the advanced processing page',
        priority: 'high',
      });
    }

    // If the uploaded file is large, add a step suggesting compression or chunking
    if (fileSize > 10 * 1024 * 1024) {
      steps.push({
        step: steps.length + 1,
        title: 'Compress or Chunk Large File',
        description:
          'Large files may be slow to process. Consider compressing or splitting into smaller files.',
        action: 'Compress the PDF or split into smaller documents before uploading',
        priority: 'medium',
      });
    }

    return steps;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResults([]);
      setFileInfo(null);
      processPDF(file);
    } else {
      setResults(prev => [
        ...prev,
        {
          test: 'File Validation',
          error: 'Please select a valid PDF file',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Process MonAsal (Bana).pdf
          </CardTitle>
          <CardDescription>
            Upload and analyze your MonAsal (Bana).pdf cookbook for recipe extraction
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
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
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

          {/* File Info */}
          {fileInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  File Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>File Name:</strong> {fileInfo.fileName}
                  </div>
                  <div>
                    <strong>File Size:</strong> {fileInfo.fileSize}
                  </div>
                  <div>
                    <strong>Data URI Length:</strong> {fileInfo.dataUriLength.toLocaleString()}
                  </div>
                  <div>
                    <strong>Type:</strong>{' '}
                    {fileInfo.isImagePDF ? 'Image PDF (scanned)' : 'Text PDF'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Analysis Results</h3>
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
                        <AlertDescription>Error: {result.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {/* Text Extraction Results */}
                        {result.result?.textExtraction && (
                          <div>
                            <strong>Text Extraction Results:</strong>
                            <div className="rounded-md bg-gray-50 p-3 text-sm">
                              <div>Pages: {result.result?.textExtraction?.pages ?? 'Unknown'}</div>
                              <div>
                                Text Length: {result.result?.textExtraction?.textLength ?? 0}{' '}
                                characters
                              </div>
                              <div>
                                Success: {result.result?.textExtraction?.success ? 'Yes' : 'No'}
                              </div>
                              {result.result?.textExtraction?.textPreview && (
                                <div>Preview: {result.result.textExtraction.textPreview}</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {result.result?.recommendations && (
                          <div>
                            <strong>Recommendations:</strong>
                            <div className="space-y-2">
                              {result.result.recommendations.map((rec, idx) => (
                                <Alert
                                  key={idx}
                                  variant={
                                    rec.type === 'warning'
                                      ? 'destructive'
                                      : rec.type === 'success'
                                        ? 'default'
                                        : 'default'
                                  }
                                >
                                  <Lightbulb className="h-4 w-4" />
                                  <AlertDescription>
                                    <div>
                                      <strong>{rec.title}</strong>
                                    </div>
                                    <div className="mb-2 text-sm text-gray-600">{rec.message}</div>
                                    <div className="text-sm">
                                      <strong>Solutions:</strong>
                                      <ul className="mt-1 list-inside list-disc">
                                        {rec.solutions.map((solution, solIdx) => (
                                          <li key={solIdx}>{solution}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Next Steps */}
                        {result.result?.nextSteps && (
                          <div>
                            <strong>Next Steps:</strong>
                            <div className="space-y-2">
                              {result.result.nextSteps.map((step, idx) => (
                                <Card key={idx} className="p-3">
                                  <div className="flex items-start gap-3">
                                    <Badge
                                      variant={
                                        step.priority === 'high' ? 'destructive' : 'secondary'
                                      }
                                    >
                                      Step {step.step}
                                    </Badge>
                                    <div>
                                      <div className="font-medium">{step.title}</div>
                                      <div className="text-sm text-gray-600">
                                        {step.description}
                                      </div>
                                      <div className="mt-1 text-sm text-blue-600">
                                        {step.action}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
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

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto p-4"
                  onClick={() => window.open('https://drive.google.com', '_blank')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-medium">
                      <ExternalLink className="h-4 w-4" />
                      Google Drive OCR
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Upload PDF → Right-click → Open with Google Docs
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4"
                  onClick={() => window.open('https://smallpdf.com/ocr-pdf', '_blank')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-medium">
                      <ExternalLink className="h-4 w-4" />
                      SmallPDF OCR
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Online OCR service for PDF processing
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4"
                  onClick={() => window.open('https://www.ilovepdf.com/ocr-pdf', '_blank')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-medium">
                      <ExternalLink className="h-4 w-4" />
                      ILovePDF OCR
                    </div>
                    <div className="mt-1 text-sm text-gray-600">Free online OCR for PDF files</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4"
                  onClick={() => (window.location.href = '/test-real-pdf')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 font-medium">
                      <TestTube className="h-4 w-4" />
                      Advanced Processing
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Use our advanced PDF processing system
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Instructions:</strong>
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm">
                  <li>Upload your MonAsal (Bana).pdf file above</li>
                  <li>The system will analyze the PDF and provide specific recommendations</li>
                  <li>Follow the recommended steps based on your PDF type</li>
                  <li>Use the quick action buttons for easy access to OCR tools</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
