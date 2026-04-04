'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgenticManager } from '../manager';
import { AgentContext, AgentMessage } from '../types';

export type TypingStage = 'sending' | 'received' | 'thinking';

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
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [typingStage, setTypingStage] = useState<TypingStage>('received');
  const [userMessageId, setUserMessageId] = useState<string | null>(null);

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
        // Stage 1: Sending (optional, happens very fast)
        setIsAgentTyping(true);
        setTypingStage('sending');

        const message = await manager.sendMessage(contextId, content);

        // Store user message ID to track when it appears in DB
        if (message) {
          setUserMessageId(message.id);

          // Add message optimistically for immediate display
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });

          // Stage 2: Message received (show immediately after send)
          setTypingStage('received');
        }

        // Keep typing indicator for a bit to wait for agent response
        setTimeout(() => {
          setIsAgentTyping(false);
          setUserMessageId(null);
        }, 30000); // Max 30 seconds

        return message;
      } catch (err) {
        setError(err as Error);
        setIsAgentTyping(false);
        setUserMessageId(null);
        return null;
      }
    },
    [manager, contextId]
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

  // Manual dismiss for typing indicator
  const dismissTypingIndicator = useCallback(() => {
    setIsAgentTyping(false);
    setUserMessageId(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    reload: loadMessages,
    isAgentTyping,
    typingStage,
    dismissTypingIndicator,
  };
}
