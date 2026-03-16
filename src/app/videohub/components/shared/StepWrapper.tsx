'use client';

import { AlertCircle, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import { useVideoHub } from '../../context/VideoHubProvider';

interface StepWrapperProps {
  stepNumber: number;
  title: string;
  description: string;
  children: ReactNode;
  showBack?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
  onNext?: () => void;
  showSkip?: boolean;
  onSkip?: () => void;
  isLoading?: boolean;
}

export function StepWrapper({
  stepNumber,
  title,
  description,
  children,
  showBack = true,
  showNext = true,
  nextLabel = 'Continue',
  nextDisabled = false,
  onNext,
  showSkip = false,
  onSkip,
  isLoading = false,
}: StepWrapperProps) {
  const { state, goBack, clearError } = useVideoHub();

  const handleBack = () => {
    goBack();
  };

  const handleNext = () => {
    onNext?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
            {stepNumber}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="min-h-96 bg-white rounded-lg p-6 border border-gray-200">
        {children}
      </div>

      {/* Footer Controls */}
      <div className="flex gap-3 justify-between">
        {showBack ? (
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepNumber === 1 || isLoading}
          >
            Back
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          {showSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
            >
              Skip
            </Button>
          )}
          {showNext && (
            <Button
              onClick={handleNext}
              disabled={nextDisabled || isLoading}
            >
              {isLoading ? 'Loading...' : nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
