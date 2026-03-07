import { NextRequest } from 'next/server';
import chokidar from 'chokidar';
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
      db.close();

      console.log(`[SSE] Watching database for context ${id} (JID: ${chatJid})`);

      // Watch the database file for changes
      const watcher = chokidar.watch(dbPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      watcher.on('change', async () => {
        try {
          console.log(`[SSE] Database changed, checking for new messages in ${id}`);

          // Query for the latest message
          const db = new NanoClawDB(dbPath, true);
          const messages = db.getMessages(chatJid, 1); // Get the most recent message
          db.close();

          if (messages.length > 0) {
            const latestMessage = messages[0];
            console.log(`[SSE] Sending new message to client:`, latestMessage.id);

            send({
              type: 'message',
              message: {
                ...latestMessage,
                timestamp: latestMessage.timestamp.toISOString(),
              },
            });
          }
        } catch (error) {
          console.error('[SSE] Error processing database change:', error);
        }
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected from context: ${id}`);
        clearInterval(heartbeat);
        watcher.close();
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
