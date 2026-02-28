'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAgentic, useAgentContext } from '@/lib/hooks/useAgentic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageContent } from '@/components/message-content';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const [input, setInput] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const isInitialRender = useRef(true);

  const { contexts } = useAgentic();
  const { messages, sendMessage } = useAgentContext(agentId);

  const agent = contexts.find((c) => c.id === agentId);

  // Get messages to display (last N messages)
  const displayMessages = messages.slice(-displayCount);
  const hasMore = messages.length > displayCount;

  // Auto-scroll to bottom when messages change or initially load
  useEffect(() => {
    if (messagesEndRef.current && !isLoadingMore) {
      // Small delay to ensure DOM has updated with new message
      setTimeout(() => {
        if (messagesEndRef.current) {
          const scrollContainer = scrollContainerRef.current;

          // Check if user is near the bottom (within 200px for more tolerance)
          const isNearBottom = scrollContainer
            ? scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200
            : true;

          // Only auto-scroll if initial render or user is already near bottom
          if (isInitialRender.current || isNearBottom) {
            messagesEndRef.current.scrollIntoView({
              behavior: isInitialRender.current ? 'instant' : 'smooth'
            });
          }

          isInitialRender.current = false;
        }
      }, 0);
    }
  }, [messages, isLoadingMore]);

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
          <Button onClick={() => router.push('/')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
          >
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
                {displayMessages.map((message) => (
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
                      <MessageContent content={message.content} className="text-sm" />
                      <span className="text-xs opacity-70 mt-1 block">
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

      {/* Input */}
      <div className="border-t p-4 bg-background">
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
  );
}
