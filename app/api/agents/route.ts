import { NextResponse } from 'next/server';
import { NanoClawAdapter } from '@/lib/adapters/nanoclaw';

let adapter: NanoClawAdapter | null = null;

async function getAdapter() {
  if (!adapter) {
    const enabled = process.env.NEXT_PUBLIC_NANOCLAW_ENABLED === 'true';

    console.log('[getAdapter] NEXT_PUBLIC_NANOCLAW_ENABLED:', enabled);
    console.log('[getAdapter] NANOCLAW_DB_PATH:', process.env.NANOCLAW_DB_PATH);
    console.log('[getAdapter] NANOCLAW_GROUPS_PATH:', process.env.NANOCLAW_GROUPS_PATH);

    if (!enabled) {
      console.log('[getAdapter] NanoClaw adapter disabled');
      return null;
    }

    const dbPath = process.env.NANOCLAW_DB_PATH || '/workspace/project/store/messages.db';
    const groupsPath = process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups';

    console.log('[getAdapter] Creating adapter with config:', { dbPath, groupsPath });

    adapter = new NanoClawAdapter({
      groupsPath,
      databasePath: dbPath,
      pollInterval: 0, // Disable polling in API route
    });

    try {
      await adapter.connect();
      console.log('[getAdapter] Adapter connected successfully');
    } catch (error) {
      console.error('[getAdapter] Failed to connect NanoClaw adapter:', error);
      adapter = null;
      return null;
    }
  }

  return adapter;
}

export async function GET() {
  try {
    const adapter = await getAdapter();

    if (!adapter) {
      // Return empty array if NanoClaw is disabled
      return NextResponse.json({ contexts: [], adapter: null });
    }

    const contexts = await adapter.getContexts();

    return NextResponse.json({
      contexts,
      adapter: adapter.name,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
