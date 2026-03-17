'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WorkflowStep {
  label: string;
  id: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStep: string;
  className?: string;
  onStepClick?: (stepId: string) => void;
}

export function WorkflowStepper({ steps, currentStep, className = '', onStepClick }: WorkflowStepperProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentIdx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          // Defer completion/active state until client-side to avoid hydration mismatch
          // (currentStep is restored from localStorage after SSR)
          const isActive = mounted && idx === currentIdx;
          const isCompleted = mounted && idx < currentIdx;
          const isClickable = onStepClick && mounted && (isCompleted || isActive);

          const circleContent = (
            <div
              className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold
                transition-all
                ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
                    : 'bg-gray-200 text-gray-600'
                }
                ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
              `}
            >
              {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
            </div>
          );

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle — clickable when completed or active */}
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  title={`Go to ${step.label}`}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded-full"
                >
                  {circleContent}
                </button>
              ) : (
                circleContent
              )}

              {/* Label */}
              <div className="ml-2 hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    isActive
                      ? 'text-green-700'
                      : isCompleted
                      ? 'text-gray-700'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>

              {/* Line */}
              {idx < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2
                    ${isCompleted || isActive ? 'bg-green-200' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
