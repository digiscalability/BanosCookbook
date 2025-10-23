'use client';

import { AlertCircle, CheckCircle, Clock, Eye, TestTube, Upload } from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function TestImagePDFPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  type AnalysisResult = {
    test: string;
    result?: {
      fileInfo?: {
        fileName: string;
        fileSize: string;
        dataUriLength: number;
        isLargeFile: boolean;
        isImagePDF: boolean;
      };
      textExtraction?: {
        pages?: number;
        textLength?: number;
        success?: boolean;
        textPreview?: string;
      };
      recommendations?: Array<{
        type: 'warning' | 'info' | 'success';
        message: string;
        solution: string;
      }>;
    };
    error?: string;
    timestamp: string;
  };

  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  type FileInfo = {
    fileName: string;
    fileSize: string;
    dataUriLength: number;
    isLargeFile: boolean;
    isImagePDF: boolean;
  };
  const [pdfInfo, setPdfInfo] = useState<FileInfo | null>(null);

  const analyzePDF = async (file: File) => {
    setIsProcessing(true);
    setCurrentTest('Analyzing PDF...');
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
              test: 'File Analysis',
              error: 'Failed to read PDF file',
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsProcessing(false);
          return;
        }

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProcessingProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 10;
          });
        }, 200);

        try {
          // Basic file analysis
          const fileSize = file.size;
          const dataUriLength = pdfDataUri.length;

          setPdfInfo({
            fileName: file.name,
            fileSize: (fileSize / 1024 / 1024).toFixed(2) + ' MB',
            dataUriLength: dataUriLength,
            isLargeFile: fileSize > 5 * 1024 * 1024, // > 5MB
            isImagePDF: dataUriLength > 10000000, // > 10MB data URI suggests image PDF
          });

          // Test basic text extraction
          const response = await fetch('/api/test-pdf-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfDataUri }),
          });

          const textResult = await response.json();

          clearInterval(progressInterval);
          setProcessingProgress(100);

          setResults(prev => [
            ...prev,
            {
              test: 'PDF Analysis',
              result: {
                fileInfo: {
                  fileName: file.name,
                  fileSize: (fileSize / 1024 / 1024).toFixed(2) + ' MB',
                  dataUriLength: dataUriLength,
                  isLargeFile: fileSize > 5 * 1024 * 1024,
                  isImagePDF: dataUriLength > 10000000,
                },
                textExtraction: textResult,
                recommendations: generateRecommendations(textResult, fileSize),
              },
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
          test: 'PDF Analysis',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const generateRecommendations = (textResult: unknown, fileSize: number) => {
    const recommendations: Array<{
      type: 'warning' | 'info' | 'success';
      message: string;
      solution: string;
    }> = [];
    const tr = textResult as { textLength?: number } | undefined;

    if ((tr?.textLength ?? 0) < 100) {
      recommendations.push({
        type: 'warning',
        message: 'This appears to be an image-based PDF (scanned cookbook)',
        solution: 'OCR processing is required but GraphicsMagick is not installed',
      });
    }

    if (fileSize > 10 * 1024 * 1024) {
      recommendations.push({
        type: 'info',
        message: 'Large file detected - processing may be slow',
        solution: 'Consider compressing the PDF or processing in smaller chunks',
      });
    }

    if ((tr?.textLength ?? 0) > 100) {
      recommendations.push({
        type: 'success',
        message: 'Text extraction is possible',
        solution: 'Use text-only or hybrid processing mode',
      });
    }

    return recommendations;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResults([]);
      analyzePDF(file);
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
            <TestTube className="h-5 w-5" />
            Image-Based PDF Analysis
          </CardTitle>
          <CardDescription>
            Analyze your MonAsal (Bana).pdf to determine the best processing approach
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

          {/* PDF Info */}
          {pdfInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  PDF File Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>File Name:</strong> {pdfInfo.fileName}
                  </div>
                  <div>
                    <strong>File Size:</strong> {pdfInfo.fileSize}
                  </div>
                  <div>
                    <strong>Data URI Length:</strong> {pdfInfo.dataUriLength.toLocaleString()}
                  </div>
                  <div>
                    <strong>Type:</strong> {pdfInfo.isImagePDF ? 'Image PDF' : 'Text PDF'}
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
                        {result.result?.fileInfo && (
                          <div>
                            <strong>File Information:</strong>
                            <div className="rounded-md bg-gray-50 p-3 text-sm">
                              <div>File: {result.result.fileInfo.fileName}</div>
                              <div>Size: {result.result.fileInfo.fileSize}</div>
                              <div>
                                Data URI: {result.result.fileInfo.dataUriLength.toLocaleString()}{' '}
                                chars
                              </div>
                              <div>
                                Type:{' '}
                                {result.result.fileInfo.isImagePDF
                                  ? 'Image PDF (scanned)'
                                  : 'Text PDF'}
                              </div>
                            </div>
                          </div>
                        )}

                        {result.result?.textExtraction && (
                          <div>
                            <strong>Text Extraction Results:</strong>
                            <div className="rounded-md bg-gray-50 p-3 text-sm">
                              <div>Pages: {result.result.textExtraction.pages || 'Unknown'}</div>
                              <div>
                                Text Length: {result.result.textExtraction.textLength || 0}{' '}
                                characters
                              </div>
                              <div>
                                Success: {result.result.textExtraction.success ? 'Yes' : 'No'}
                              </div>
                              {result.result.textExtraction.textPreview && (
                                <div>Preview: {result.result.textExtraction.textPreview}</div>
                              )}
                            </div>
                          </div>
                        )}

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
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <div>
                                      <strong>{rec.message}</strong>
                                    </div>
                                    <div className="text-sm text-gray-600">{rec.solution}</div>
                                  </AlertDescription>
                                </Alert>
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

          {/* Instructions */}
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Instructions:</strong>
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm">
                  <li>Upload your MonAsal (Bana).pdf file</li>
                  <li>The system will analyze the PDF structure and content</li>
                  <li>
                    Based on the analysis, you will get recommendations for the best processing
                    method
                  </li>
                  <li>
                    For image-based PDFs, OCR processing is required but GraphicsMagick needs to be
                    installed
                  </li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
