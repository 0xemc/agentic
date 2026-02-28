'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Agent, Message } from '@/types/agent';
import { AgentGrid } from '@/components/agent-grid';
import { AgentSidebar } from '@/components/agent-sidebar';
import { useAgentic, useAgentContext } from '@/lib/hooks/useAgentic';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { contexts, loading, error, manager } = useAgentic();
  const { messages, sendMessage } = useAgentContext(selectedAgent?.id || null);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleAgentClick = (agent: Agent) => {
    if (isMobile) {
      // Navigate to dedicated page on mobile
      router.push(`/agent/${agent.id}`);
    } else {
      // Open sidebar on desktop
      setSelectedAgent(agent);
    }
  };

  const handleCloseSidebar = () => {
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
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-2xl font-bold tracking-tight">
                  AGENTIC <span className="text-muted-foreground font-mono text-lg">/ MISSION CONTROL</span>
                </h1>
              </div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider pl-5">
                Framework-Agnostic Agent Management System
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  Adapters
                </div>
                <div className="flex gap-2">
                  {adapters.map((adapter, index) => (
                    <div
                      key={adapter.name}
                      className="px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 font-mono text-xs font-bold uppercase tracking-wide text-primary"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'slideInRight 0.5s ease-out forwards',
                        opacity: 0,
                      }}
                    >
                      {adapter.name}
                    </div>
                  ))}
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main>
        {loading && (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                  Initializing
                </p>
                <p className="text-xs text-muted-foreground/60 font-mono">
                  Loading agent contexts...
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="container mx-auto px-6 py-8">
            <div className="bg-red-500/10 border-2 border-red-500/20 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 font-mono font-bold">!</span>
                </div>
                <div>
                  <p className="text-red-500 font-semibold font-mono uppercase tracking-wide text-sm">
                    System Error
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && agents.length === 0 && (
          <div className="container mx-auto px-6 py-24 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <span className="text-3xl">📡</span>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-mono uppercase tracking-wider text-muted-foreground">
                  No Active Agents
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Configure adapters in <code className="px-2 py-0.5 rounded bg-muted font-mono text-xs">lib/config/adapters.ts</code> to connect to your agent frameworks
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && agents.length > 0 && (
          <AgentGrid agents={agents} onAgentClick={handleAgentClick} />
        )}
      </main>

      {/* Desktop: Sidebar */}
      <AgentSidebar
        agent={selectedAgent}
        messages={dialogMessages}
        open={!!selectedAgent && !isMobile}
        onClose={handleCloseSidebar}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
