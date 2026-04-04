import { useState, useEffect, useCallback, useRef } from 'react';
import { AgenticManager } from '../core/manager';
import { AgentContext, AgentMessage } from '../core/types';
import { usePolling } from './usePolling';

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
        }
        return [...prev, context];
      });
    });
    return unsubscribe;
  }, [manager]);

  useEffect(() => { loadContexts(); }, [loadContexts]);

  return { manager, contexts, loading, error, reload: loadContexts };
}

/**
 * Hook for interacting with a specific agent context.
 * Uses polling instead of SSE since React Native has no native EventSource.
 */
export function useAgentContext(contextId: string | null) {
  const manager = getAgenticManager();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const seenIdsRef = useRef(new Set<string>());

  const loadMessages = useCallback(async () => {
    if (!contextId) { setMessages([]); return; }
    try {
      setLoading(true);
      setError(null);
      const msgs = await manager.getMessages(contextId);
      msgs.forEach(m => seenIdsRef.current.add(m.id));
      setMessages(msgs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [manager, contextId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!contextId) return null;
    try {
      setIsAgentTyping(true);
      const message = await manager.sendMessage(contextId, content);
      if (message) {
        seenIdsRef.current.add(message.id);
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
      }
      // Typing indicator dismissed when agent response arrives via polling
      setTimeout(() => setIsAgentTyping(false), 30000); // max 30s safety fallback
      return message;
    } catch (err) {
      setError(err as Error);
      setIsAgentTyping(false);
      return null;
    }
  }, [manager, contextId]);

  // Subscribe to new messages from manager (e.g., from mock adapter callbacks)
  useEffect(() => {
    return manager.onMessage((message) => {
      if (message.contextId === contextId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (message.sender === 'agent') setIsAgentTyping(false);
      }
    });
  }, [manager, contextId]);

  // Poll for new messages every 2 seconds
  usePolling<{ messages: AgentMessage[] }>({
    url: `/api/agents/${contextId}/messages`,
    enabled: !!contextId,
    interval: 2000,
    onData: ({ messages: newMessages }) => {
      setMessages(prev => {
        let updated = [...prev];
        let changed = false;
        for (const msg of newMessages) {
          if (!seenIdsRef.current.has(msg.id)) {
            seenIdsRef.current.add(msg.id);
            updated.push({ ...msg, timestamp: new Date(msg.timestamp) });
            changed = true;
            if (msg.sender === 'agent') setIsAgentTyping(false);
          }
        }
        return changed ? updated : prev;
      });
    },
  });

  useEffect(() => { loadMessages(); }, [loadMessages]);

  return { messages, loading, error, sendMessage, reload: loadMessages, isAgentTyping };
}
