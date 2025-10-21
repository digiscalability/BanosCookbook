'use client';

import type { AdvancedRecipesFromPdfOutput } from '@/ai/flows/recipes-from-pdf-advanced';
import { extractRecipeDataFromPdfAdvanced } from '@/app/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    Brain,
    CheckCircle,
    FileText,
    Image as ImageIcon,
    Settings,
    Zap
} from 'lucide-react';
import React, { useState } from 'react';

interface PDFProcessorProps {
  onRecipesExtracted: (recipes: AdvancedRecipesFromPdfOutput['recipes'], processingInfo: AdvancedRecipesFromPdfOutput['processingInfo']) => void;
  onError: (error: string) => void;
}

interface ProcessingOptions {
  processingMode: 'text-only' | 'ocr-only' | 'hybrid' | 'auto';
  ocrLanguage: string;
  imageQuality: 'low' | 'medium' | 'high';
  enableAIEnhancement: boolean;
}

export default function PDFProcessor({ onRecipesExtracted, onError }: PDFProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingInfo, setProcessingInfo] = useState<AdvancedRecipesFromPdfOutput['processingInfo'] | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [options, setOptions] = useState<ProcessingOptions>({
    processingMode: 'auto',
    ocrLanguage: 'eng',
    imageQuality: 'high',
    enableAIEnhancement: true,
  });

  const processPDF = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingInfo(null);

    try {
      // Convert file to data URI
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfDataUri = e.target?.result as string;

        if (!pdfDataUri) {
          onError('Failed to read PDF file');
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
          const result = await extractRecipeDataFromPdfAdvanced(pdfDataUri, options);

          clearInterval(progressInterval);
          setProcessingProgress(100);

          if (result.success && result.data) {
            setProcessingInfo(result.data.processingInfo as AdvancedRecipesFromPdfOutput['processingInfo']);
            onRecipesExtracted(result.data.recipes, result.data.processingInfo as AdvancedRecipesFromPdfOutput['processingInfo']);
          } else {
            onError(result.error || 'Failed to extract recipes');
          }
        } catch (error) {
          clearInterval(progressInterval);
          onError(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setIsProcessing(false);
      onError(`File reading error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processPDF(file);
    } else {
      onError('Please select a valid PDF file');
    }
  };

  const getProcessingModeDescription = (mode: ProcessingOptions['processingMode']) => {
    switch (mode) {
      case 'text-only':
        return 'Fast text extraction for digital PDFs';
      case 'ocr-only':
        return 'OCR processing for scanned/image PDFs';
      case 'hybrid':
        return 'Combines text extraction + OCR for maximum accuracy';
      case 'auto':
        return 'AI automatically chooses the best method';
      default:
        return 'Unknown processing mode';
    }
  };

  const getProcessingModeIcon = (mode: ProcessingOptions['processingMode']) => {
    switch (mode) {
      case 'text-only':
        return <FileText className="h-4 w-4" />;
      case 'ocr-only':
        return <ImageIcon className="h-4 w-4" />;
      case 'hybrid':
        return <Zap className="h-4 w-4" />;
      case 'auto':
        return <Brain className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Advanced PDF Recipe Extraction
          </CardTitle>
          <CardDescription>
            State-of-the-art PDF processing with AI-powered OCR for image-heavy cookbooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label htmlFor="pdf-upload" className="block text-sm font-medium">
              Upload PDF Cookbook
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing PDF...</span>
                <span>{Math.round(processingProgress)}%</span>
              </div>
              <Progress value={processingProgress} className="w-full" />
            </div>
          )}

          {/* Processing Info */}
          {processingInfo && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getProcessingModeIcon(processingInfo.processingMode)}
                    <span className="font-medium">
                      {processingInfo.processingMode.toUpperCase()} Processing
                    </span>
                    <Badge variant="secondary">
                      {processingInfo.totalPages} pages
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {getProcessingModeDescription(processingInfo.processingMode)}
                  </div>
                  {processingInfo.imagesProcessed > 0 && (
                    <div className="text-sm text-gray-600">
                      OCR processed {processingInfo.imagesProcessed} images
                      {processingInfo.ocrAccuracy && (
                        <span> (Accuracy: {Math.round(processingInfo.ocrAccuracy * 100)}%)</span>
                      )}
                    </div>
                  )}
                  {processingInfo.aiEnhanced && (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      AI-enhanced text processing applied
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    Processing time: {processingInfo.processingTime}ms
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Advanced Options */}
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvancedOptions && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Processing Mode</label>
                    <select
                      value={options.processingMode}
                      onChange={(e) => setOptions(prev => ({
                          ...prev,
                          processingMode: e.target.value as ProcessingOptions['processingMode']
                        }))}
                      className="w-full p-2 border rounded-md"
                      aria-label="Processing Mode Selection"
                      title="Choose how to process the PDF"
                    >
                      <option value="auto">Auto (Recommended)</option>
                      <option value="text-only">Text Only (Fast)</option>
                      <option value="ocr-only">OCR Only (Accurate)</option>
                      <option value="hybrid">Hybrid (Best of Both)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">OCR Language</label>
                    <select
                      value={options.ocrLanguage}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        ocrLanguage: e.target.value
                      }))}
                      className="w-full p-2 border rounded-md"
                      aria-label="OCR Language Selection"
                      title="Choose the language for OCR processing"
                    >
                      <option value="eng">English</option>
                      <option value="spa">Spanish</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="ita">Italian</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Image Quality</label>
                    <select
                      value={options.imageQuality}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        imageQuality: e.target.value as ProcessingOptions['imageQuality']
                      }))}
                      className="w-full p-2 border rounded-md"
                      aria-label="Image Quality Selection"
                      title="Choose the image processing quality"
                    >
                      <option value="high">High (Best Quality)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="low">Low (Fastest)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.enableAIEnhancement}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          enableAIEnhancement: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">AI Enhancement</span>
                    </label>
                    <p className="text-xs text-gray-500">
                      AI-powered text cleaning and recipe optimization
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
