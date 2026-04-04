/**
 * Mock Adapter for Agentic
 *
 * Provides mock data for testing and demonstration purposes
 */

import { AgenticAdapter, AgentContext, AgentMessage } from '../core/types';

export class MockAdapter implements AgenticAdapter {
  readonly name = 'mock';
  private connected = false;
  private contextUpdateCallbacks: Set<(context: AgentContext) => void> = new Set();
  private messageCallbacks: Set<(message: AgentMessage) => void> = new Set();

  private mockContexts: AgentContext[] = [
    {
      id: 'mock-1',
      name: 'Research Assistant',
      status: 'active',
      type: 'Mock Research',
      lastActivity: new Date(Date.now() - 1000 * 60 * 5),
      currentTask: 'Analyzing market trends for Q1 2026',
      messageCount: 42,
      metadata: { adapter: 'mock' },
    },
    {
      id: 'mock-2',
      name: 'Code Reviewer',
      status: 'idle',
      type: 'Mock Development',
      lastActivity: new Date(Date.now() - 1000 * 60 * 30),
      currentTask: 'Waiting for new pull requests',
      messageCount: 128,
      metadata: { adapter: 'mock' },
    },
    {
      id: 'mock-3',
      name: 'Data Analyst',
      status: 'active',
      type: 'Mock Analytics',
      lastActivity: new Date(Date.now() - 1000 * 60 * 2),
      currentTask: 'Processing customer behavior data',
      messageCount: 89,
      metadata: { adapter: 'mock' },
    },
  ];

  private mockMessages: Record<string, AgentMessage[]> = {
    'mock-1': [
      {
        id: 'm1',
        contextId: 'mock-1',
        sender: 'user',
        content: 'Can you analyze the latest market trends?',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
      },
      {
        id: 'm2',
        contextId: 'mock-1',
        sender: 'agent',
        content: "I'll start analyzing the market trends for Q1 2026. This will take a few minutes.",
        timestamp: new Date(Date.now() - 1000 * 60 * 9),
      },
      {
        id: 'm3',
        contextId: 'mock-1',
        sender: 'agent',
        content: 'Analysis complete! The data shows a 15% increase in renewable energy investments.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
  };

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getContexts(): Promise<AgentContext[]> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }
    return this.mockContexts;
  }

  async getContext(id: string): Promise<AgentContext | null> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }
    return this.mockContexts.find((c) => c.id === id) || null;
  }

  async getMessages(contextId: string, limit?: number): Promise<AgentMessage[]> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }
    const messages = this.mockMessages[contextId] || [];
    return limit ? messages.slice(-limit) : messages;
  }

  async sendMessage(contextId: string, content: string): Promise<AgentMessage> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }

    const newMessage: AgentMessage = {
      id: `m${Date.now()}`,
      contextId,
      sender: 'user',
      content,
      timestamp: new Date(),
    };

    if (!this.mockMessages[contextId]) {
      this.mockMessages[contextId] = [];
    }
    this.mockMessages[contextId].push(newMessage);

    // Update context
    const context = this.mockContexts.find((c) => c.id === contextId);
    if (context) {
      context.messageCount++;
      context.lastActivity = new Date();
      this.contextUpdateCallbacks.forEach((cb) => cb(context));
    }

    this.messageCallbacks.forEach((cb) => cb(newMessage));

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: AgentMessage = {
        id: `m${Date.now()}`,
        contextId,
        sender: 'agent',
        content: 'Processing your request...',
        timestamp: new Date(),
      };

      this.mockMessages[contextId].push(agentMessage);
      this.messageCallbacks.forEach((cb) => cb(agentMessage));

      if (context) {
        context.messageCount++;
        context.lastActivity = new Date();
        this.contextUpdateCallbacks.forEach((cb) => cb(context));
      }
    }, 1000);

    return newMessage;
  }

  onContextUpdate(callback: (context: AgentContext) => void): () => void {
    this.contextUpdateCallbacks.add(callback);
    return () => this.contextUpdateCallbacks.delete(callback);
  }

  onMessage(callback: (message: AgentMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }
}
