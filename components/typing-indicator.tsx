'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface TypingIndicatorProps {
  agentName: string;
  onDismiss?: () => void;
}

const stages = [
  { message: 'Message received...', icon: '✓' },
  { message: 'Thinking...', icon: '💭' },
  { message: 'Processing...', icon: '⚙️' },
];

export function TypingIndicator({ agentName, onDismiss }: TypingIndicatorProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    // Cycle through stages every 2 seconds
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const currentStage = stages[stageIndex];

  return (
    <div className="flex flex-col items-start group/typing">
      <span className="text-[9px] font-mono font-semibold uppercase tracking-wider mb-1 px-1 opacity-50">
        {agentName}
      </span>
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted border border-border/50 relative">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 flex items-center justify-center opacity-0 group-hover/typing:opacity-100 transition-opacity"
            title="Dismiss typing indicator"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-base">{currentStage.icon}</span>
          <span className="text-sm text-muted-foreground italic">
            {currentStage.message}
          </span>
          <div className="flex gap-1 ml-1">
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '-0.32s',
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '-0.16s',
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{
                animation: 'bounce 1.4s infinite ease-in-out both',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
