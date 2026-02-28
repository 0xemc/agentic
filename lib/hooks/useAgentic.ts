'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgenticManager } from '../core/manager';
import { AgentContext, AgentMessage } from '../core/types';

let managerInstance: AgenticManager | null = null;

/**
 * Get or create the global AgenticManager instance
 */
export function getAgenticManager(): AgenticManager {
  if (!managerInstance) {
    managerInstance = new AgenticManager();
  }
  return managerInstance;
}

/**
 * React hook for using Agentic in components
 */
export function useAgentic() {
  const [manager] = useState(() => getAgenticManager());
  const [contexts, setContexts] = useState<AgentContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load all contexts
  const loadContexts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allContexts = await manager.getAllContexts();
      setContexts(allContexts);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  // Subscribe to context updates
  useEffect(() => {
    const unsubscribe = manager.onContextUpdate((context) => {
      setContexts((prev) => {
        const index = prev.findIndex((c) => c.id === context.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = context;
          return updated;
        } else {
          return [...prev, context];
        }
      });
    });

    return unsubscribe;
  }, [manager]);

  // Initial load
  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  return {
    manager,
    contexts,
    loading,
    error,
    reload: loadContexts,
  };
}

/**
 * Hook for interacting with a specific context
 */
export function useAgentContext(contextId: string | null) {
  const manager = getAgenticManager();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load messages for the context
  const loadMessages = useCallback(async () => {
    if (!contextId) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const contextMessages = await manager.getMessages(contextId);
      setMessages(contextMessages);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [manager, contextId]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!contextId) return null;

      try {
        const message = await manager.sendMessage(contextId, content);

        // Reload messages to ensure we have the latest from the database
        // Don't add message optimistically - just reload to avoid duplicates
        setTimeout(() => loadMessages(), 500);

        return message;
      } catch (err) {
        setError(err as Error);
        return null;
      }
    },
    [manager, contextId, loadMessages]
  );

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = manager.onMessage((message) => {
      if (message.contextId === contextId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    return unsubscribe;
  }, [manager, contextId]);

  // Load messages when context changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    reload: loadMessages,
  };
}
