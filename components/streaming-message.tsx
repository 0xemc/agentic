'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageContent } from './message-content';

interface StreamingMessageProps {
  content: string;
  /** If true, animate the text appearing word-by-word */
  animate?: boolean;
  className?: string;
  onComplete?: () => void;
}

const WORDS_PER_SECOND = 80;

/**
 * Renders agent message content with an optional streaming (word-by-word) animation.
 * Pass animate=true for new messages, animate=false for history.
 */
export function StreamingMessage({ content, animate = false, className, onComplete }: StreamingMessageProps) {
  const words = useRef(content.split(' '));
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : words.current.length);
  const [done, setDone] = useState(!animate);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Re-initialise if content changes (e.g. message updated)
  useEffect(() => {
    words.current = content.split(' ');
    if (!animate) {
      setVisibleCount(words.current.length);
      setDone(true);
      return;
    }
    setVisibleCount(0);
    setDone(false);
  }, [content, animate]);

  // Drive the animation
  useEffect(() => {
    if (done) return;

    const total = words.current.length;
    // Adaptive speed: faster for short messages, capped for very long ones
    const msPerWord = Math.max(8, Math.min(30, 1000 / WORDS_PER_SECOND));

    intervalRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= total) {
          clearInterval(intervalRef.current!);
          setDone(true);
          onComplete?.();
          return total;
        }
        return next;
      });
    }, msPerWord);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [done, onComplete]);

  const visibleText = words.current.slice(0, visibleCount).join(' ');

  return (
    <div className={className}>
      <MessageContent content={visibleText} className="text-sm" />
      {!done && (
        <span
          className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 align-text-bottom"
          style={{ animation: 'blink 1s step-end infinite' }}
        />
      )}
    </div>
  );
}
