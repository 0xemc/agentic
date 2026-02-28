'use client';

import { useState } from 'react';
import { Agent, Message } from '@/types/agent';
import { AgentGrid } from '@/components/agent-grid';
import { AgentDialog } from '@/components/agent-dialog';

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Research Assistant',
    status: 'active',
    type: 'Research',
    lastActivity: new Date(Date.now() - 1000 * 60 * 5),
    currentTask: 'Analyzing market trends for Q1 2026',
    messageCount: 42,
  },
  {
    id: '2',
    name: 'Code Reviewer',
    status: 'idle',
    type: 'Development',
    lastActivity: new Date(Date.now() - 1000 * 60 * 30),
    currentTask: 'Waiting for new pull requests',
    messageCount: 128,
  },
  {
    id: '3',
    name: 'Data Analyst',
    status: 'active',
    type: 'Analytics',
    lastActivity: new Date(Date.now() - 1000 * 60 * 2),
    currentTask: 'Processing customer behavior data',
    messageCount: 89,
  },
  {
    id: '4',
    name: 'Content Writer',
    status: 'offline',
    type: 'Content',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2),
    messageCount: 56,
  },
  {
    id: '5',
    name: 'QA Tester',
    status: 'error',
    type: 'Testing',
    lastActivity: new Date(Date.now() - 1000 * 60 * 15),
    currentTask: 'Error: Connection timeout',
    messageCount: 23,
  },
  {
    id: '6',
    name: 'DevOps Agent',
    status: 'active',
    type: 'Infrastructure',
    lastActivity: new Date(Date.now() - 1000 * 60),
    currentTask: 'Monitoring deployment pipeline',
    messageCount: 201,
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      agentId: '1',
      sender: 'user',
      content: 'Can you analyze the latest market trends?',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      id: 'm2',
      agentId: '1',
      sender: 'agent',
      content: 'I\'ll start analyzing the market trends for Q1 2026. This will take a few minutes.',
      timestamp: new Date(Date.now() - 1000 * 60 * 9),
    },
    {
      id: 'm3',
      agentId: '1',
      sender: 'agent',
      content: 'Analysis complete! The data shows a 15% increase in renewable energy investments.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
  ],
  '2': [],
  '3': [],
  '4': [],
  '5': [],
  '6': [],
};

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleCloseDialog = () => {
    setSelectedAgent(null);
  };

  const handleSendMessage = (content: string) => {
    if (!selectedAgent) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      agentId: selectedAgent.id,
      sender: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedAgent.id]: [...(prev[selectedAgent.id] || []), newMessage],
    }));

    // Update agent's message count and last activity
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgent.id
          ? { ...a, messageCount: a.messageCount + 1, lastActivity: new Date() }
          : a
      )
    );

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: `m${Date.now()}`,
        agentId: selectedAgent.id,
        sender: 'agent',
        content: 'Processing your request...',
        timestamp: new Date(),
      };

      setMessages((prev) => ({
        ...prev,
        [selectedAgent.id]: [...(prev[selectedAgent.id] || []), agentMessage],
      }));

      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgent.id
            ? { ...a, messageCount: a.messageCount + 1, lastActivity: new Date() }
            : a
        )
      );
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold">Agentic Mission Control</h1>
          <p className="text-muted-foreground mt-1">
            Manage and interact with your AI agents
          </p>
        </div>
      </header>

      <main>
        <AgentGrid agents={agents} onAgentClick={handleAgentClick} />
      </main>

      <AgentDialog
        agent={selectedAgent}
        messages={selectedAgent ? messages[selectedAgent.id] || [] : []}
        open={!!selectedAgent}
        onClose={handleCloseDialog}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
