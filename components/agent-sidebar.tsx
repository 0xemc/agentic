'use client';

import { Agent, Message } from '@/types/agent';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageContent } from '@/components/message-content';
import { formatDistanceToNow } from 'date-fns';
import { X, Activity, Clock, MessageSquare, Send, AlertCircle, Pause, Power } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface AgentSidebarProps {
  agent: Agent | null;
  messages: Message[];
  open: boolean;
  onClose: () => void;
  onSendMessage: (content: string) => void;
}

const statusConfig = {
  active: {
    icon: Activity,
    color: 'text-emerald-400 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/20',
    border: 'border-emerald-500/20 dark:border-emerald-400/30',
    label: 'ACTIVE'
  },
  idle: {
    icon: Pause,
    color: 'text-amber-500 dark:text-yellow-300',
    bg: 'bg-amber-500/10 dark:bg-yellow-400/20',
    border: 'border-amber-500/20 dark:border-yellow-400/30',
    label: 'IDLE'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-red-500/20 dark:border-red-500/30',
    label: 'ERROR'
  },
  offline: {
    icon: Power,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-500/10 dark:bg-gray-500/20',
    border: 'border-gray-500/20 dark:border-gray-500/30',
    label: 'OFFLINE'
  },
};

export function AgentSidebar({
  agent,
  messages,
  open,
  onClose,
  onSendMessage,
}: AgentSidebarProps) {
  const [input, setInput] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.floor(window.innerWidth * 0.25);
    }
    return 450;
  });
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Get messages to display (last N messages)
  const displayMessages = messages.slice(-displayCount);
  const hasMore = messages.length > displayCount;

  // Auto-scroll to bottom when messages change or sidebar opens
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (open && messagesEndRef.current && !isLoadingMore) {
      const scrollContainer = scrollContainerRef.current;

      // Check if user is near the bottom (within 100px)
      const isNearBottom = scrollContainer
        ? scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100
        : true;

      // Only auto-scroll if initial render or user is already near bottom
      if (isInitialRender.current || isNearBottom) {
        // Small delay to ensure DOM has updated with new message
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: isInitialRender.current ? 'instant' : 'smooth'
            });
          }
        }, 0);
      }

      isInitialRender.current = false;
    }
  }, [messages, open, isLoadingMore]);

  // Reset initial render flag when sidebar closes
  useEffect(() => {
    if (!open) {
      isInitialRender.current = true;
    }
  }, [open]);

  // Handle scroll to load more messages
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;

    // If user scrolls near the top, load more messages
    if (target.scrollTop < 100 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      previousScrollHeight.current = target.scrollHeight;

      // Load 20 more messages
      setTimeout(() => {
        setDisplayCount((prev) => Math.min(prev + 20, messages.length));
        setIsLoadingMore(false);
      }, 300);
    }
  };

  // Maintain scroll position after loading more messages
  useEffect(() => {
    if (isLoadingMore === false && scrollContainerRef.current && previousScrollHeight.current > 0) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeight.current;
      scrollContainerRef.current.scrollTop = scrollDiff;
      previousScrollHeight.current = 0;
    }
  }, [isLoadingMore]);

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();

      const delta = startXRef.current - e.clientX;
      const minWidth = 350;
      const maxWidth = Math.floor(window.innerWidth * 0.9);
      const newWidth = Math.min(Math.max(minWidth, startWidthRef.current + delta), maxWidth);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (!agent) return null;

  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="p-0 gap-0 border-l-2"
        data-resizable="true"
        style={{
          '--sheet-width': `${width}px`
        } as React.CSSProperties}
      >
        <VisuallyHidden>
          <SheetTitle>{agent.name} - Agent Chat</SheetTitle>
        </VisuallyHidden>
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-[100] group flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          <div className="w-1.5 h-24 bg-primary/30 group-hover:bg-primary group-hover:w-2 rounded-full transition-all shadow-sm" />
        </div>
        {/* Header */}
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-mono text-base font-bold text-primary">
                {agent.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">{agent.name}</h2>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  {agent.type}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Status & Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {/* Status */}
            <div className={`p-3 rounded-md ${status.bg} ${status.border} border`}>
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
                <span className={`text-[10px] font-mono font-bold tracking-wide ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Last Activity */}
            <div className="col-span-2 p-3 rounded-md bg-background/50 border border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wide">
                    Last Activity
                  </p>
                  <p className="text-xs font-medium truncate">
                    {formatDistanceToNow(agent.lastActivity, { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Task */}
          {agent.currentTask && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide mb-2">
                  Current Task
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {agent.currentTask}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-6"
          >
            <div className="space-y-4 py-6">
              {displayMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    No messages yet
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Start a conversation below
                  </p>
                </div>
              ) : (
                <>
                  {isLoadingMore && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground font-mono">
                        Loading more messages...
                      </p>
                    </div>
                  )}
                  {hasMore && !isLoadingMore && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground font-mono">
                        Scroll up to load more ({messages.length - displayCount} older)
                      </p>
                    </div>
                  )}
                  {displayMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
                      style={{
                        animationDelay: `${index * 30}ms`,
                        animation: 'fadeInUp 0.3s ease-out forwards',
                        opacity: 0,
                      }}
                    >
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-wider mb-1 px-1 opacity-50">
                        {message.sender === 'user' ? 'You' : agent.name}
                      </span>
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted border border-border/50'
                        }`}
                      >
                        <MessageContent
                          content={message.content}
                          className="text-sm leading-relaxed"
                        />
                        <span className="text-[10px] opacity-60 mt-2 block font-mono">
                          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Input */}
        <div className="p-4 bg-muted/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 border border-border/50 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 font-mono mt-2 px-1">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
