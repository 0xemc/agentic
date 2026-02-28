/**
 * Core framework-agnostic types for Agentic
 */

export interface AgentContext {
  id: string;
  name: string;
  status: AgentStatus;
  type: string;
  lastActivity: Date;
  currentTask?: string;
  messageCount: number;
  metadata?: Record<string, unknown>;
}

export type AgentStatus = 'active' | 'idle' | 'error' | 'offline';

export interface AgentMessage {
  id: string;
  contextId: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AgenticAdapter {
  /**
   * Unique identifier for this adapter
   */
  readonly name: string;

  /**
   * Initialize the adapter connection
   */
  connect(): Promise<void>;

  /**
   * Disconnect and cleanup
   */
  disconnect(): Promise<void>;

  /**
   * Get all available agent contexts
   */
  getContexts(): Promise<AgentContext[]>;

  /**
   * Get a specific context by ID
   */
  getContext(id: string): Promise<AgentContext | null>;

  /**
   * Get messages for a specific context
   */
  getMessages(contextId: string, limit?: number): Promise<AgentMessage[]>;

  /**
   * Send a message to an agent context
   */
  sendMessage(contextId: string, content: string): Promise<AgentMessage>;

  /**
   * Subscribe to context updates
   */
  onContextUpdate(callback: (context: AgentContext) => void): () => void;

  /**
   * Subscribe to new messages
   */
  onMessage(callback: (message: AgentMessage) => void): () => void;
}

export interface AdapterConfig {
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}
