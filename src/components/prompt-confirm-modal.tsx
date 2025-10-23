'use client';
import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PromptConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  settings?: { model?: string; ratio?: string; duration?: number };
  onConfirm: (prompt: string, settings: { ratio?: string; duration?: number }) => Promise<void>;
}

export default function PromptConfirmModal({
  open,
  onOpenChange,
  initialPrompt,
  settings,
  onConfirm,
}: PromptConfirmModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [ratio, setRatio] = useState(settings?.ratio || '1280:720');
  const [duration, setDuration] = useState(settings?.duration ?? 5);
  const [working, setWorking] = useState(false);

  // Reset when opened or initial prompt/settings change
  useEffect(() => {
    if (open) {
      setPrompt(initialPrompt || '');
      setRatio(settings?.ratio || '1280:720');
      setDuration(settings?.duration ?? 5);
    }
  }, [open, initialPrompt, settings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Review prompt & settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="prompt-textarea" className="text-sm font-medium">
              Prompt (editable)
            </label>
            <textarea
              id="prompt-textarea"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              aria-label="Editable prompt"
              className="mt-1 h-40 w-full rounded border p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prompt-ratio" className="text-sm font-medium">
                Aspect ratio
              </label>
              <select
                id="prompt-ratio"
                value={ratio}
                onChange={e => setRatio(e.target.value)}
                aria-label="Aspect ratio"
                className="mt-1 w-full rounded border p-2 text-sm"
              >
                <option value="1280:720">16:9 (Horizontal)</option>
                <option value="720:1280">9:16 (Vertical)</option>
                <option value="960:960">1:1 (Square)</option>
              </select>
            </div>
            <div>
              <label htmlFor="prompt-duration" className="text-sm font-medium">
                Duration (seconds)
              </label>
              <input
                id="prompt-duration"
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value || '5'))}
                aria-label="Duration in seconds"
                className="mt-1 w-full rounded border p-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="btn btn-outline"
              onClick={() => onOpenChange(false)}
              disabled={working}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setWorking(true);
                try {
                  await onConfirm(prompt, { ratio, duration });
                  onOpenChange(false);
                } finally {
                  setWorking(false);
                }
              }}
              disabled={working}
            >
              {working ? 'Submitting...' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
