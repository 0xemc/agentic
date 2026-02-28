'use client';

import { Agent, Message } from '@/types/agent';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';
import { useState } from 'react';

interface AgentSidebarProps {
  agent: Agent | null;
  messages: Message[];
  open: boolean;
  onClose: () => void;
  onSendMessage: (content: string) => void;
}

export function AgentSidebar({
  agent,
  messages,
  open,
  onClose,
  onSendMessage,
}: AgentSidebarProps) {
  const [input, setInput] = useState('');

  if (!agent) return null;

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[540px] p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {agent.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{agent.name}</h2>
                <p className="text-sm text-muted-foreground">{agent.type}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
              {agent.status}
            </Badge>
            <span className="text-muted-foreground">
              {formatDistanceToNow(agent.lastActivity, { addSuffix: true })}
            </span>
          </div>

          {agent.currentTask && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-1">Current Task</p>
              <p className="text-sm text-muted-foreground">{agent.currentTask}</p>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start a conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
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
        <div className="p-4">
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
      </SheetContent>
    </Sheet>
  );
}
