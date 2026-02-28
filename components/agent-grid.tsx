'use client';

import { Agent } from '@/types/agent';
import { AgentCard } from './agent-card';

interface AgentGridProps {
  agents: Agent[];
  onAgentClick: (agent: Agent) => void;
}

export function AgentGrid({ agents, onAgentClick }: AgentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onClick={() => onAgentClick(agent)}
        />
      ))}
    </div>
  );
}
