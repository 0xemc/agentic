import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  url: string;
  enabled?: boolean;
  intervalMs?: number;
  onMessage: (data: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Polls an endpoint periodically and emits parsed JSON results.
 * Used instead of SSE on platforms that lack EventSource (React Native).
 */
export function usePolling({
  url,
  enabled = true,
  intervalMs = 2000,
  onMessage,
  onError,
}: UsePollingOptions) {
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const poll = useCallback(async () => {
    try {
      const separator = url.includes('?') ? '&' : '?';
      const pollUrl = lastIdRef.current
        ? `${url}${separator}after=${encodeURIComponent(lastIdRef.current)}`
        : url;
      const res = await fetch(pollUrl);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          lastIdRef.current = msg.id;
          onMessageRef.current({ type: 'message', message: msg });
        }
      }
    } catch (err) {
      onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(poll, intervalMs);
    poll(); // immediate first call
    return () => clearInterval(id);
  }, [enabled, poll, intervalMs]);
}
