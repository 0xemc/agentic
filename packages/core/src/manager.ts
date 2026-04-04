/**
 * AgenticManager - Core manager for handling multiple adapters
 */

import { AgenticAdapter, AgentContext, AgentMessage } from './types';

export class AgenticManager {
  private adapters: Map<string, AgenticAdapter> = new Map();
  private contextUpdateCallbacks: Set<(context: AgentContext) => void> = new Set();
  private messageCallbacks: Set<(message: AgentMessage) => void> = new Set();

  /**
   * Register an adapter
   */
  registerAdapter(adapter: AgenticAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter "${adapter.name}" is already registered`);
    }

    this.adapters.set(adapter.name, adapter);

    // Subscribe to adapter events and forward to manager callbacks
    adapter.onContextUpdate((context) => {
      this.contextUpdateCallbacks.forEach((cb) => cb(context));
    });

    adapter.onMessage((message) => {
      this.messageCallbacks.forEach((cb) => cb(message));
    });
  }

  /**
   * Unregister an adapter
   */
  async unregisterAdapter(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(name);
    }
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): AgenticAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapter by name
   */
  getAdapter(name: string): AgenticAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Connect all adapters
   */
  async connectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.adapters.values()).map((adapter) => adapter.connect())
    );
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.adapters.values()).map((adapter) => adapter.disconnect())
    );
  }

  /**
   * Get all contexts from all adapters
   */
  async getAllContexts(): Promise<AgentContext[]> {
    const contextArrays = await Promise.all(
      Array.from(this.adapters.values()).map((adapter) => adapter.getContexts())
    );
    return contextArrays.flat();
  }

  /**
   * Get context by ID (searches all adapters)
   */
  async getContext(id: string): Promise<AgentContext | null> {
    for (const adapter of this.adapters.values()) {
      const context = await adapter.getContext(id);
      if (context) return context;
    }
    return null;
  }

  /**
   * Get messages for a context (searches all adapters)
   */
  async getMessages(contextId: string, limit?: number): Promise<AgentMessage[]> {
    for (const adapter of this.adapters.values()) {
      const context = await adapter.getContext(contextId);
      if (context) {
        return adapter.getMessages(contextId, limit);
      }
    }
    return [];
  }

  /**
   * Send message to a context (searches all adapters)
   */
  async sendMessage(contextId: string, content: string): Promise<AgentMessage | null> {
    for (const adapter of this.adapters.values()) {
      const context = await adapter.getContext(contextId);
      if (context) {
        return adapter.sendMessage(contextId, content);
      }
    }
    return null;
  }

  /**
   * Subscribe to context updates from any adapter
   */
  onContextUpdate(callback: (context: AgentContext) => void): () => void {
    this.contextUpdateCallbacks.add(callback);
    return () => this.contextUpdateCallbacks.delete(callback);
  }

  /**
   * Subscribe to messages from any adapter
   */
  onMessage(callback: (message: AgentMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }
}
