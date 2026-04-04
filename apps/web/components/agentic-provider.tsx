'use client';

import { useEffect, useState } from 'react';
import { getAgenticManager } from '@/lib/hooks/useAgentic';
import { initializeAdapters } from '@/lib/config/adapters';

export function AgenticProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const manager = getAgenticManager();
        await initializeAdapters(manager);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize adapters:', error);
        // Still mark as initialized to render the UI
        setInitialized(true);
      }
    };

    init();
  }, []);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing Agentic...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
