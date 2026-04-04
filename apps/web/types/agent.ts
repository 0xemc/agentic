/**
 * Legacy types - maintained for backwards compatibility with UI components
 * Maps to core framework-agnostic types
 */

import { AgentContext, AgentMessage } from '@/lib/core/types';

export type Agent = AgentContext & { avatar?: string };
export interface Message extends Omit<AgentMessage, 'contextId'> {
  agentId: string;
}

export interface Context {
  agentId: string;
  messages: Message[];
  metadata: {
    created: Date;
    updated: Date;
  };
}

// Re-export core types for convenience
export type { AgentContext, AgentMessage, AgentStatus } from '@/lib/core/types';
export type { AgenticAdapter, AdapterConfig } from '@/lib/core/types';
