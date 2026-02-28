import { NextResponse } from 'next/server';
import { NanoClawAdapter } from '@/lib/adapters/nanoclaw';

let adapter: NanoClawAdapter | null = null;

async function getAdapter() {
  if (!adapter) {
    const enabled = process.env.NEXT_PUBLIC_NANOCLAW_ENABLED === 'true';

    if (!enabled) {
      return null;
    }

    adapter = new NanoClawAdapter({
      groupsPath: process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups',
      pollInterval: 0,
    });

    try {
      await adapter.connect();
    } catch (error) {
      console.error('Failed to connect NanoClaw adapter:', error);
      adapter = null;
      return null;
    }
  }

  return adapter;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adapter = await getAdapter();

    if (!adapter) {
      return NextResponse.json({ messages: [] });
    }

    // Get limit from query params (default 20)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const messages = await adapter.getMessages(id, limit);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
