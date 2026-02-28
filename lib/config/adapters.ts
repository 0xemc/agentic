/**
 * Adapter configuration and initialization
 */

import { AgenticManager } from '../core/manager';
import { MockAdapter } from '../adapters/mock';
import { APIAdapter } from '../adapters/api';

/**
 * Initialize and register all configured adapters
 */
export async function initializeAdapters(manager: AgenticManager): Promise<void> {
  const config = getAdapterConfig();

  // Client-side: Use API adapter to fetch from server endpoints
  if (typeof window !== 'undefined') {
    // Check if NanoClaw is enabled via API
    if (config.nanoclaw.enabled) {
      const apiAdapter = new APIAdapter(config.nanoclaw.pollInterval);
      manager.registerAdapter(apiAdapter);
    }

    // Optionally enable mock adapter for testing
    if (config.mock.enabled) {
      const mockAdapter = new MockAdapter();
      manager.registerAdapter(mockAdapter);
    }
  }

  // Connect all adapters
  await manager.connectAll();
}

/**
 * Get adapter configuration from environment
 */
export function getAdapterConfig() {
  return {
    nanoclaw: {
      enabled: process.env.NEXT_PUBLIC_NANOCLAW_ENABLED === 'true',
      pollInterval: parseInt(process.env.NANOCLAW_POLL_INTERVAL || '5000', 10),
    },
    mock: {
      enabled: process.env.NEXT_PUBLIC_MOCK_ENABLED === 'true',
    },
  };
}
