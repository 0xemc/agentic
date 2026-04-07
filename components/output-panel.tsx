'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Terminal, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentMessage } from '@/lib/core/types';

interface OutputPanelProps {
  agentName: string;
  /** The latest agent message — streams in as it arrives */
  latestMessage: AgentMessage | null;
  /** True while the agent is processing */
  isTyping: boolean;
  onClose: () => void;
}

/**
 * Slide-in right panel that shows the agent's latest response streaming in,
 * with a terminal-style aesthetic.
 */
export function OutputPanel({ agentName, latestMessage, isTyping, onClose }: OutputPanelProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamedMessageId, setStreamedMessageId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Stream in the latest message word-by-word when it changes
  useEffect(() => {
    if (!latestMessage) return;
    if (latestMessage.id === streamedMessageId) return;

    // New message arrived — reset and stream it in
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStreamedMessageId(latestMessage.id);

    const words = latestMessage.content.split(' ');
    let idx = 0;
    setDisplayedText('');

    intervalRef.current = setInterval(() => {
      idx += 1;
      setDisplayedText(words.slice(0, idx).join(' '));
      if (idx >= words.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, Math.max(8, Math.min(25, 1000 / 80)));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [latestMessage, streamedMessageId]);

  // Auto-scroll panel to bottom as text streams
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedText]);

  const isStreaming = intervalRef.current !== null;

  return (
    <div
      className={`flex flex-col border-l bg-zinc-950 text-zinc-100 transition-all duration-300 ${
        isExpanded ? 'fixed inset-0 z-50' : 'w-80 lg:w-96 shrink-0'
      }`}
    >
      {/* Panel header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <Terminal className="h-4 w-4 text-zinc-400" />
        <span className="text-xs font-mono font-semibold text-zinc-300 flex-1">
          {agentName} — live output
        </span>
        {isTyping && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
              style={{ animation: 'blink 1s step-end infinite' }}
            />
            processing
          </span>
        )}
        {!isTyping && latestMessage && (
          <span className="text-[10px] font-mono text-zinc-500">done</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          onClick={() => setIsExpanded((e) => !e)}
        >
          {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Output body */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed">
        {!latestMessage && isTyping && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500"
              style={{ animation: 'blink 1s step-end infinite' }}
            />
            waiting for response…
          </div>
        )}

        {displayedText && (
          <p className="text-zinc-100 whitespace-pre-wrap break-words">
            {displayedText}
            {isStreaming && (
              <span
                className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 align-text-bottom"
                style={{ animation: 'blink 0.7s step-end infinite' }}
              />
            )}
          </p>
        )}

        {/* Show previous messages as history */}
        <div ref={bottomRef} />
      </div>

      {/* Footer — char count */}
      {displayedText && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900">
          <span className="text-[10px] font-mono text-zinc-600">
            {displayedText.length} chars · {displayedText.split(' ').filter(Boolean).length} words
          </span>
        </div>
      )}
    </div>
  );
}
