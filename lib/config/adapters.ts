/**
 * Adapter configuration and initialization for React Native
 */

import { AgenticManager } from '../core/manager';
import { MockAdapter } from '../adapters/mock';
import { APIAdapter } from '../adapters/api';

/**
 * Initialize and register all configured adapters for the mobile app.
 * Uses the API adapter (fetch-based) and optionally the mock adapter.
 */
export async function initializeAdapters(manager: AgenticManager): Promise<void> {
  const config = getAdapterConfig();

  if (config.api.enabled) {
    const apiAdapter = new APIAdapter(config.api.pollInterval);
    manager.registerAdapter(apiAdapter);
  }

  if (config.mock.enabled) {
    const mockAdapter = new MockAdapter();
    manager.registerAdapter(mockAdapter);
  }

  await manager.connectAll();
}

/**
 * Get adapter configuration for the mobile app.
 * Set EXPO_PUBLIC_API_ENABLED=true to use the live API adapter.
 * Set EXPO_PUBLIC_MOCK_ENABLED=true to layer in mock data.
 */
export function getAdapterConfig() {
  return {
    api: {
      enabled: process.env.EXPO_PUBLIC_API_ENABLED !== 'false',
      pollInterval: parseInt(process.env.EXPO_PUBLIC_API_POLL_INTERVAL || '5000', 10),
    },
    mock: {
      enabled: process.env.EXPO_PUBLIC_MOCK_ENABLED === 'true',
    },
  };
}
