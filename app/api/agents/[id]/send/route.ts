import { NextRequest, NextResponse } from 'next/server';
import { NanoClawDB } from '@/lib/adapters/nanoclaw-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const dbPath = process.env.NANOCLAW_DB_PATH || '/workspace/project/store/messages.db';
    const db = new NanoClawDB(dbPath, false); // false = writable

    // Map registered group folder name to actual JID
    const groups = db.getRegisteredGroups();
    const group = groups.find((g) => g.folder === id);
    const chatJid = group ? group.jid : id; // Use JID if found, otherwise use id as-is

    const message = await db.sendMessage(chatJid, content);
    db.close();

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
