import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lines = 3;

  // Map folder ID to actual group folder path
  const groupsBasePath = process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups';
  const logsPath = path.join(groupsBasePath, id, 'logs');

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Function to get latest logs
      const getLatestLogs = async () => {
        try {
          // Check if logs directory exists
          await fs.access(logsPath);

          // Get all log files
          const files = await fs.readdir(logsPath);
          const logFiles = files
            .filter((f) => f.startsWith('container-') && f.endsWith('.log'))
            .sort()
            .reverse(); // Most recent first

          if (logFiles.length === 0) {
            return { lines: [], latest: null };
          }

          // Read the most recent log file
          const latestLog = path.join(logsPath, logFiles[0]);
          const content = await fs.readFile(latestLog, 'utf-8');
          const allLines = content.split('\n').filter((line) => line.trim());

          // Get last N lines
          const lastLines = allLines.slice(-lines);

          return {
            lines: lastLines,
            latest: logFiles[0],
          };
        } catch (error) {
          return { lines: [], latest: null };
        }
      };

      // Send initial logs
      const initialLogs = await getLatestLogs();
      sendEvent({ type: 'logs', ...initialLogs });

      // Poll for updates every 2 seconds
      const interval = setInterval(async () => {
        const logs = await getLatestLogs();
        sendEvent({ type: 'logs', ...logs });
      }, 2000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
