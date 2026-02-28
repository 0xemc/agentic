/**
 * Adapter configuration and initialization
 */

import { AgenticManager } from '../core/manager';
import { MockAdapter } from '../adapters/mock';
// import { NanoClawAdapter } from '../adapters/nanoclaw';

/**
 * Initialize and register all configured adapters
 */
export async function initializeAdapters(manager: AgenticManager): Promise<void> {
  // Mock adapter (always available for testing)
  const mockAdapter = new MockAdapter();
  manager.registerAdapter(mockAdapter);

  // NanoClaw adapter (enable if NanoClaw is available)
  // Uncomment and configure when running alongside NanoClaw
  /*
  if (typeof window === 'undefined') {
    // Server-side only
    try {
      const nanoClawAdapter = new NanoClawAdapter({
        groupsPath: process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups',
        pollInterval: 5000,
      });
      manager.registerAdapter(nanoClawAdapter);
    } catch (error) {
      console.warn('NanoClaw adapter not available:', error);
    }
  }
  */

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
      groupsPath: process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups',
      pollInterval: parseInt(process.env.NANOCLAW_POLL_INTERVAL || '5000', 10),
    },
    mock: {
      enabled: process.env.NEXT_PUBLIC_MOCK_ENABLED !== 'false', // Enabled by default
    },
  };
}
