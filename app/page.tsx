'use client';

import { useState } from 'react';
import { Agent, Message } from '@/types/agent';
import { AgentGrid } from '@/components/agent-grid';
import { AgentDialog } from '@/components/agent-dialog';
import { useAgentic, useAgentContext } from '@/lib/hooks/useAgentic';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { contexts, loading, error, manager } = useAgentic();
  const { messages, sendMessage } = useAgentContext(selectedAgent?.id || null);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleCloseDialog = () => {
    setSelectedAgent(null);
  };

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  // Convert AgentContext to Agent (add missing fields for UI compatibility)
  const agents: Agent[] = contexts.map((ctx) => ({
    ...ctx,
    avatar: undefined,
  }));

  // Convert AgentMessage[] to Message[]
  const dialogMessages: Message[] = messages.map((msg) => ({
    ...msg,
    agentId: msg.contextId,
  }));

  const adapters = manager.getAdapters();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Agentic Mission Control</h1>
              <p className="text-muted-foreground mt-1">
                Framework-agnostic dashboard for managing AI agents
              </p>
            </div>
            <div className="flex gap-2">
              {adapters.map((adapter) => (
                <Badge key={adapter.name} variant="outline">
                  {adapter.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main>
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="container mx-auto px-6 py-8">
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive font-semibold">Error loading agents</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {!loading && !error && agents.length === 0 && (
          <div className="container mx-auto px-6 py-16 text-center">
            <p className="text-muted-foreground text-lg">No agents found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configure adapters to connect to your agent frameworks
            </p>
          </div>
        )}

        {!loading && !error && agents.length > 0 && (
          <AgentGrid agents={agents} onAgentClick={handleAgentClick} />
        )}
      </main>

      <AgentDialog
        agent={selectedAgent}
        messages={dialogMessages}
        open={!!selectedAgent}
        onClose={handleCloseDialog}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
