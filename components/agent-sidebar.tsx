'use client';

import { Agent, Message } from '@/types/agent';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { X, Activity, Clock, MessageSquare, Send, AlertCircle, Pause, Power } from 'lucide-react';
import { useState } from 'react';

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
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'ACTIVE'
  },
  idle: {
    icon: Pause,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'IDLE'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'ERROR'
  },
  offline: {
    icon: Power,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
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
      <SheetContent side="right" className="w-full sm:w-[540px] p-0 flex flex-col border-l-2">
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
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-6">
            {messages.length === 0 ? (
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
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{
                    animationDelay: `${index * 30}ms`,
                    animation: 'fadeInUp 0.3s ease-out forwards',
                    opacity: 0,
                  }}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted border border-border/50'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    <span className="text-[10px] opacity-60 mt-2 block font-mono">
                      {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

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
