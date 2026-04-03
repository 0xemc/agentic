import { NextRequest } from 'next/server';
import { NanoClawDB } from '@/lib/adapters/nanoclaw-db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dbPath = process.env.NANOCLAW_DB_PATH || '/workspace/project/store/messages.db';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial connection message
      send({ type: 'connected' });

      // Mock agents: just keep alive with heartbeat, no DB watching needed
      if (id.startsWith('mock-')) {
        const heartbeat = setInterval(() => {
          try {
            send({ type: 'heartbeat', timestamp: new Date().toISOString() });
          } catch {
            clearInterval(heartbeat);
          }
        }, 30_000);

        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          controller.close();
        });
        return;
      }

      console.log(`[SSE] Starting stream for context: ${id}`);

      // Get registered groups to map folder to JID
      const db = new NanoClawDB(dbPath, true);
      const groups = db.getRegisteredGroups();
      const group = groups.find((g) => g.folder === id);
      const chatJid = group ? group.jid : id;

      // Seed lastSentMessageId with the current latest message so we don't
      // re-send history that the client already loaded via the REST endpoint.
      const existing = db.getMessages(chatJid, 1);
      db.close();
      let lastSentMessageId: string | null = existing.length > 0 ? existing[0].id : null;

      console.log(`[SSE] Polling database for context ${id} (JID: ${chatJid}), baseline: ${lastSentMessageId}`);

      // Poll every 1 second for new messages.
      // File-watching (chokidar) doesn't work here because NanoClaw runs in a
      // separate container — inotify events don't cross container boundaries on
      // shared bind mounts. Polling is the reliable alternative.
      const poll = setInterval(async () => {
        try {
          const db = new NanoClawDB(dbPath, true);
          const messages = db.getMessages(chatJid, 1);
          db.close();

          if (messages.length > 0) {
            const latestMessage = messages[0];

            if (latestMessage.id !== lastSentMessageId) {
              lastSentMessageId = latestMessage.id;
              console.log(`[SSE] New message detected, sending to client:`, latestMessage.id);

              send({
                type: 'message',
                message: {
                  ...latestMessage,
                  timestamp: latestMessage.timestamp.toISOString(),
                },
              });
            }
          }
        } catch (error) {
          console.error('[SSE] Error polling database:', error);
        }
      }, 1000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected from context: ${id}`);
        clearInterval(poll);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
