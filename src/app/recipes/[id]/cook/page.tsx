'use client';

import { ArrowLeft, ArrowRight, CheckCircle, ChefHat, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getRecipeById } from '@/lib/firestore-recipes';
import type { Recipe } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };

export default function CookModePage({ params }: Props) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load recipe
  useEffect(() => {
    getRecipeById(id).then(setRecipe);
  }, [id]);

  // Screen wake lock — keep display on while cooking
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => { wakeLock = lock; }).catch(() => {});
    }
    return () => { wakeLock?.release().catch(() => {}); };
  }, []);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => { setTimer(0); setTimerRunning(false); };

  if (!recipe) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center text-white">
        <ChefHat className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  const steps = recipe.instructions;
  const current = steps[stepIdx];
  const progress = ((stepIdx) / steps.length) * 100;
  const allDone = completed.size === steps.length;

  const goNext = () => {
    setCompleted(prev => new Set([...prev, stepIdx]));
    resetTimer();
    if (stepIdx < steps.length - 1) setStepIdx(i => i + 1);
  };

  const goPrev = () => {
    resetTimer();
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col select-none overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <Link href={`/recipes/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
          <span className="text-sm">Exit</span>
        </Link>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cook Mode</p>
          <p className="text-sm font-semibold truncate max-w-[200px]">{recipe.title}</p>
        </div>
        <div className="text-sm text-gray-400">
          {stepIdx + 1} / {steps.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-700 shrink-0">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Ingredients sidebar hint */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main step content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          {allDone ? (
            <div className="space-y-4">
              <CheckCircle className="h-20 w-20 text-green-400 mx-auto" />
              <h2 className="text-3xl font-bold">Recipe Complete!</h2>
              <p className="text-gray-400">Enjoy your {recipe.title} 🎉</p>
              <Link href={`/recipes/${id}`}>
                <Button variant="outline" className="text-white border-gray-600 mt-4">
                  Back to Recipe
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Step number */}
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-6 transition-colors
                ${completed.has(stepIdx) ? 'bg-green-500' : 'bg-green-700'}
              `}>
                {completed.has(stepIdx) ? <CheckCircle className="h-8 w-8" /> : stepIdx + 1}
              </div>

              {/* Step text */}
              <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed font-medium max-w-2xl">
                {current}
              </p>

              {/* Timer */}
              <div className="mt-8 flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <span className="text-2xl font-mono tabular-nums text-gray-300">
                  {formatTime(timer)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTimerRunning(r => !r)}
                  className="text-white border-gray-600 hover:bg-gray-700"
                >
                  {timerRunning ? 'Pause' : timer > 0 ? 'Resume' : 'Start Timer'}
                </Button>
                {timer > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetTimer}
                    className="text-gray-400 hover:text-white"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      {!allDone && (
        <div className="flex items-center justify-between px-4 py-4 bg-gray-800 border-t border-gray-700 shrink-0">
          <Button
            onClick={goPrev}
            disabled={stepIdx === 0}
            variant="ghost"
            size="lg"
            className="text-white disabled:opacity-30 hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => { setStepIdx(i); resetTimer(); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === stepIdx
                    ? 'bg-green-400 w-4'
                    : completed.has(i)
                    ? 'bg-green-600'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={goNext}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {stepIdx === steps.length - 1 ? 'Finish' : 'Next'}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
