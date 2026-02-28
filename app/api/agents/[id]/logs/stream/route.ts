import { NextRequest } from 'next/server';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupsBasePath = process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups';
  const logsPath = path.join(groupsBasePath, id, 'logs');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[SSE Logs] Starting stream for agent: ${id}`);

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Function to read and send the latest log lines
      const sendLatestLogs = async () => {
        try {
          // Check if logs directory exists
          try {
            await fs.access(logsPath);
          } catch {
            // Directory doesn't exist yet
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'logs', lines: [] })}\n\n`));
            return;
          }

          // Get all log files
          const files = await fs.readdir(logsPath);
          const logFiles = files
            .filter(f => f.startsWith('container-') && f.endsWith('.log'))
            .sort()
            .reverse(); // Most recent first

          if (logFiles.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'logs', lines: [] })}\n\n`));
            return;
          }

          // Read the most recent log file
          const latestLogPath = path.join(logsPath, logFiles[0]);
          const content = await fs.readFile(latestLogPath, 'utf-8');

          // Get last 3 lines
          const allLines = content.split('\n').filter(line => line.trim().length > 0);
          const lastLines = allLines.slice(-3);

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'logs',
            lines: lastLines,
            latest: logFiles[0]
          })}\n\n`));
        } catch (error) {
          console.error('[SSE Logs] Error reading logs:', error);
        }
      };

      // Send initial logs
      await sendLatestLogs();

      // Watch the logs directory for changes
      const watcher = chokidar.watch(logsPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      watcher.on('change', sendLatestLogs);
      watcher.on('add', sendLatestLogs);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE Logs] Client disconnected from agent: ${id}`);
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
      'X-Accel-Buffering': 'no',
    },
  });
}
