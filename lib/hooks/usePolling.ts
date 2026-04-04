import { useEffect, useRef } from 'react';

interface UsePollingOptions<T> {
  url: string;
  enabled: boolean;
  interval?: number;
  onData: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Mobile replacement for useSSE — polls an endpoint at a regular interval.
 * React Native doesn't have EventSource, so we fetch the latest messages
 * periodically instead.
 */
export function usePolling<T>({ url, enabled, interval = 2000, onData, onError }: UsePollingOptions<T>) {
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);

  useEffect(() => { onDataRef.current = onData; }, [onData]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: T = await res.json();
        onDataRef.current(data);
      } catch (err) {
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    poll(); // immediate first fetch
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [url, enabled, interval]);
}
