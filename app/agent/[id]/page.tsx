'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAgentic, useAgentContext } from '@/lib/hooks/useAgentic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageContent } from '@/components/message-content';
import { StreamingMessage } from '@/components/streaming-message';
import { TypingIndicator } from '@/components/typing-indicator';
import { OutputPanel } from '@/components/output-panel';
import { ArrowLeft, PanelRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import type { AgentMessage } from '@/lib/core/types';

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const [input, setInput] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [latestAgentMessage, setLatestAgentMessage] = useState<AgentMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const isInitialRender = useRef(true);
  const lastKnownMessageId = useRef<string | null>(null);

  const { contexts } = useAgentic();
  const {
    messages,
    sendMessage,
    isAgentTyping,
    typingStage,
    dismissTypingIndicator,
  } = useAgentContext(agentId);

  const agent = contexts.find((c) => c.id === agentId);
  const displayMessages = messages.slice(-displayCount);
  const hasMore = messages.length > displayCount;

  // Detect newly arrived agent messages
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.id === lastKnownMessageId.current) return;

    if (!isInitialRender.current && latest.sender === 'agent') {
      setStreamingIds((prev) => new Set(prev).add(latest.id));
      setLatestAgentMessage(latest);
    }
    lastKnownMessageId.current = latest.id;
  }, [messages]);

  // Auto-open panel when agent starts responding
  useEffect(() => {
    if (isAgentTyping) setPanelOpen(true);
  }, [isAgentTyping]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore) {
      setTimeout(() => {
        if (!messagesEndRef.current) return;
        const sc = scrollContainerRef.current;
        const isNearBottom = sc
          ? sc.scrollHeight - sc.scrollTop - sc.clientHeight < 200
          : true;
        if (isInitialRender.current || isNearBottom) {
          messagesEndRef.current.scrollIntoView({
            behavior: isInitialRender.current ? 'instant' : 'smooth',
          });
        }
        isInitialRender.current = false;
      }, 0);
    }
  }, [messages, isLoadingMore]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollTop < 100 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      previousScrollHeight.current = target.scrollHeight;
      setTimeout(() => {
        setDisplayCount((prev) => Math.min(prev + 20, messages.length));
        setIsLoadingMore(false);
      }, 300);
    }
  };

  useEffect(() => {
    if (!isLoadingMore && scrollContainerRef.current && previousScrollHeight.current > 0) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      scrollContainerRef.current.scrollTop = newScrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = 0;
    }
  }, [isLoadingMore]);

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Agent not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {agent.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-semibold">{agent.name}</h1>
              <p className="text-sm text-muted-foreground">{agent.type}</p>
            </div>
            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
              {agent.status}
            </Badge>
            {/* Toggle output panel */}
            <Button
              variant={panelOpen ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setPanelOpen((o) => !o)}
              title="Toggle output panel"
            >
              <PanelRight className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-4"
          >
            <div className="space-y-4 py-4">
              {displayMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                <>
                  {isLoadingMore && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground font-mono">Loading more messages...</p>
                    </div>
                  )}
                  {hasMore && !isLoadingMore && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground font-mono">
                        Scroll up to load more ({messages.length - displayCount} older)
                      </p>
                    </div>
                  )}

                  {displayMessages.map((message) => {
                    const shouldStream = streamingIds.has(message.id) && !completedIds.has(message.id);
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-wider mb-1 px-1 opacity-50">
                          {message.sender === 'user' ? 'You' : agent.name}
                        </span>
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.sender === 'agent' ? (
                            <StreamingMessage
                              content={message.content}
                              animate={shouldStream}
                              onComplete={() =>
                                setCompletedIds((prev) => new Set(prev).add(message.id))
                              }
                            />
                          ) : (
                            <MessageContent content={message.content} className="text-sm" />
                          )}
                          <span className="text-xs opacity-70 mt-1 block">
                            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {isAgentTyping && (
                    <TypingIndicator
                      agentName={agent.name}
                      stage={typingStage}
                      onDismiss={dismissTypingIndicator}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input */}
        <div
          className="border-t p-4 bg-background"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </div>

      {/* Output panel — slides in from the right */}
      {panelOpen && (
        <OutputPanel
          agentName={agent.name}
          latestMessage={latestAgentMessage}
          isTyping={isAgentTyping}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
