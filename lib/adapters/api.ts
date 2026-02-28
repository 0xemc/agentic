/**
 * API Adapter for Agentic
 *
 * Fetches agent data from API routes (which can access server-side resources)
 */

import { AgenticAdapter, AgentContext, AgentMessage } from '../core/types';

export class APIAdapter implements AgenticAdapter {
  readonly name = 'api';
  private connected = false;
  private pollTimer?: NodeJS.Timeout;
  private contextUpdateCallbacks: Set<(context: AgentContext) => void> = new Set();
  private messageCallbacks: Set<(message: AgentMessage) => void> = new Set();
  private lastContexts: Map<string, AgentContext> = new Map();

  constructor(private pollInterval = 5000) {}

  async connect(): Promise<void> {
    this.connected = true;

    // Start polling for updates
    if (this.pollInterval > 0) {
      this.pollTimer = setInterval(() => this.pollForUpdates(), this.pollInterval);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.connected = false;
  }

  async getContexts(): Promise<AgentContext[]> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }

    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const contexts = data.contexts || [];

      // Convert date strings to Date objects
      return contexts.map((ctx: any) => ({
        ...ctx,
        lastActivity: new Date(ctx.lastActivity),
      }));
    } catch (error) {
      console.error('Error fetching contexts from API:', error);
      return [];
    }
  }

  async getContext(id: string): Promise<AgentContext | null> {
    const contexts = await this.getContexts();
    return contexts.find((c) => c.id === id) || null;
  }

  async getMessages(contextId: string, limit?: number): Promise<AgentMessage[]> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }

    try {
      const response = await fetch(`/api/agents/${contextId}/messages`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const messages = data.messages || [];

      // Convert date strings to Date objects
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error('Error fetching messages from API:', error);
      return [];
    }
  }

  async sendMessage(contextId: string, content: string): Promise<AgentMessage> {
    console.log('[APIAdapter] sendMessage called:', { contextId, content });

    if (!this.connected) {
      console.error('[APIAdapter] Adapter not connected');
      throw new Error('Adapter not connected');
    }

    try {
      console.log('[APIAdapter] Making POST request to:', `/api/agents/${contextId}/send`);
      const response = await fetch(`/api/agents/${contextId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      console.log('[APIAdapter] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[APIAdapter] API error response:', errorData);
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[APIAdapter] Success response:', data);
      const message = data.message;

      // Convert date string to Date object
      return {
        ...message,
        timestamp: new Date(message.timestamp),
      };
    } catch (error) {
      console.error('[APIAdapter] Error sending message:', error);
      throw error;
    }
  }

  onContextUpdate(callback: (context: AgentContext) => void): () => void {
    this.contextUpdateCallbacks.add(callback);
    return () => this.contextUpdateCallbacks.delete(callback);
  }

  onMessage(callback: (message: AgentMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  private async pollForUpdates(): Promise<void> {
    try {
      const contexts = await this.getContexts();

      for (const context of contexts) {
        const lastContext = this.lastContexts.get(context.id);

        // If this is a new context or activity changed, notify listeners
        if (!lastContext || context.lastActivity.getTime() !== lastContext.lastActivity.getTime()) {
          this.lastContexts.set(context.id, context);
          this.contextUpdateCallbacks.forEach((cb) => cb(context));
        }
      }
    } catch (error) {
      console.error('Error polling for updates:', error);
    }
  }
}
