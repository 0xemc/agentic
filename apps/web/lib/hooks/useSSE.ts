'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSSEOptions {
  url: string;
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

/**
 * Hook for managing Server-Sent Events (SSE) connections
 *
 * @param options - Configuration options
 * @param options.url - The SSE endpoint URL
 * @param options.onMessage - Callback for processing incoming messages
 * @param options.onError - Optional callback for handling errors
 * @param options.enabled - Whether the connection should be active (default: true)
 */
export function useSSE({ url, onMessage, onError, enabled = true }: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) return;

    console.log('[useSSE] Connecting to:', url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[useSSE] Message received:', data);
        onMessageRef.current(data);
      } catch (error) {
        console.error('[useSSE] Error parsing message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[useSSE] Connection error:', error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
      // Do NOT call eventSource.close() here — the native EventSource API
      // handles automatic reconnection on errors. Closing it would permanently
      // kill the connection with no way to recover.
    };

    return () => {
      console.log('[useSSE] Closing connection:', url);
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, enabled]); // Only depend on url and enabled, not callbacks

  return eventSourceRef;
}
