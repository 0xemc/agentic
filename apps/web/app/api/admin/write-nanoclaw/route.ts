/**
 * Temporary admin endpoint — writes source files to the NanoClaw project
 * and triggers a rebuild + restart.
 *
 * Called once by the scheduled task that adds the web channel.
 * This file is deleted by the same task after success.
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const NANOCLAW_ROOT = process.env.NANOCLAW_ROOT || '/home/xemc/nanoclaw/0xemc';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'write-web-channel') {
      const webTsPath = `${NANOCLAW_ROOT}/src/channels/web.ts`;
      const indexTsPath = `${NANOCLAW_ROOT}/src/channels/index.ts`;

      // 1. Write web.ts
      const webTsContent = `import { ASSISTANT_NAME } from '../config.js';
import { storeMessageDirect } from '../db.js';
import { logger } from '../logger.js';
import { Channel } from '../types.js';
import { registerChannel } from './registry.js';

/**
 * Web channel — handles agents created via the Agentic dashboard.
 * JIDs are synthetic: web:{timestamp}:{folder}
 *
 * Inbound messages are written directly to the DB by the dashboard's send
 * API route. This channel's only job is to own those JIDs so NanoClaw
 * doesn't skip them, and to write agent responses back to the DB so the
 * dashboard's SSE polling can pick them up.
 */
export class WebChannel implements Channel {
  name = 'web';

  ownsJid(jid: string): boolean {
    return jid.startsWith('web:');
  }

  isConnected(): boolean {
    return true;
  }

  async connect(): Promise<void> {
    logger.info('Web channel ready');
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    const messageId = \`bot_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`;
    const timestamp = new Date().toISOString();
    storeMessageDirect({
      id: messageId,
      chat_jid: jid,
      sender: ASSISTANT_NAME,
      sender_name: ASSISTANT_NAME,
      content: text,
      timestamp,
      is_from_me: false,
      is_bot_message: true,
    });
    logger.info({ jid }, 'Web channel: stored agent response in DB');
  }
}

registerChannel('web', () => new WebChannel());
`;

      await fs.writeFile(webTsPath, webTsContent, 'utf-8');

      // 2. Update index.ts — append web import if not already present
      let indexContent = await fs.readFile(indexTsPath, 'utf-8');
      if (!indexContent.includes("import './web.js'")) {
        indexContent = indexContent.trimEnd() + `\n\n// web (Agentic dashboard agents)\nimport './web.js';\n`;
        await fs.writeFile(indexTsPath, indexContent, 'utf-8');
      }

      // 3. Build
      const { stdout: buildOut, stderr: buildErr } = await execAsync(
        'npm run build',
        { cwd: NANOCLAW_ROOT, timeout: 120000 }
      );

      // 4. Restart (try systemd, then pm2)
      let restartMethod = 'unknown';
      let restartOut = '';
      try {
        const r = await execAsync('systemctl restart nanoclaw', { timeout: 15000 });
        restartMethod = 'systemd';
        restartOut = r.stdout + r.stderr;
      } catch {
        try {
          const r = await execAsync('pm2 restart nanoclaw', { timeout: 15000 });
          restartMethod = 'pm2';
          restartOut = r.stdout + r.stderr;
        } catch {
          try {
            const r = await execAsync('systemctl --user restart nanoclaw', { timeout: 15000 });
            restartMethod = 'systemd-user';
            restartOut = r.stdout + r.stderr;
          } catch (err3) {
            restartMethod = 'failed';
            restartOut = String(err3);
          }
        }
      }

      return NextResponse.json({
        success: true,
        webTsWritten: webTsPath,
        indexTsUpdated: indexTsPath,
        build: { stdout: buildOut.slice(0, 500), stderr: buildErr.slice(0, 500) },
        restart: { method: restartMethod, output: restartOut.slice(0, 300) },
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin write-nanoclaw error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
