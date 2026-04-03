import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { generateFolderName, getChannelConfig, type ChannelType } from '@/lib/core/channels';

/**
 * Create a new agent group (not tied to an existing messaging platform group)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, channel = 'web', trigger = '' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Get channel config
    const channelConfig = getChannelConfig(channel as ChannelType);
    const folder = generateFolderName(channel as ChannelType, name);

    // Generate a synthetic JID for non-messaging-platform groups
    // Format: {channel}:{timestamp}:{folder}
    const jid = `${channel}:${Date.now()}:${folder}`;

    // Open database
    const dbPath = process.env.NANOCLAW_DB_PATH || '/workspace/project/store/messages.db';
    const db = new Database(dbPath);

    try {
      // Check if folder already exists
      const existing = db.prepare('SELECT * FROM registered_groups WHERE folder = ?').get(folder);
      if (existing) {
        db.close();
        return NextResponse.json(
          { error: 'An agent with this name already exists' },
          { status: 409 }
        );
      }

      const addedAt = new Date().toISOString();
      // Determine if trigger is required:
      // - No trigger word provided = no trigger required
      // - Web channel = no trigger required
      // - Otherwise = trigger required
      const requiresTrigger = !trigger || !trigger.trim() || channel === 'web' ? 0 : 1;

      // Create folder structure BEFORE writing to DB so a disk error never
      // leaves a dangling DB entry that blocks future retries.
      const groupsPath = process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups';
      const groupFolderPath = path.join(groupsPath, folder);

      await fs.mkdir(groupFolderPath, { recursive: true });
      await fs.mkdir(path.join(groupFolderPath, 'logs'), { recursive: true });
      await fs.mkdir(path.join(groupFolderPath, 'conversations'), { recursive: true });

      // Create initial CLAUDE.md
      const claudeMd = `# ${name}

You are Barry, a personal assistant for ${name}.

## Context

This agent runs on ${channelConfig.name}. Follow the general instructions from the global CLAUDE.md.

${channel === 'web' ? `
## Web Dashboard Access

This agent is accessible directly through the Agentic dashboard. Messages sent here will be processed immediately without requiring a trigger word.
` : ''}

## Memory

Use this file to remember important context about this agent and its users.
`;

      await fs.writeFile(path.join(groupFolderPath, 'CLAUDE.md'), claudeMd, 'utf-8');

      // For web agents, create a welcome message
      if (channel === 'web') {
        const readme = `# ${name}

This is a web-based agent context. You can interact with it directly through the Agentic dashboard.

**Created:** ${new Date().toLocaleDateString()}
**Channel:** ${channelConfig.name}
**Trigger:** ${requiresTrigger ? trigger : 'None (all messages processed)'}
`;
        await fs.writeFile(path.join(groupFolderPath, 'README.md'), readme, 'utf-8');
      }

      // Folder is ready — now register in DB
      const stmt = db.prepare(`
        INSERT INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(jid, name, folder, trigger || '', addedAt, requiresTrigger);

      db.close();

      return NextResponse.json({
        success: true,
        group: {
          jid,
          name,
          folder,
          channel,
          trigger,
          requiresTrigger,
          addedAt,
        },
      });
    } catch (error) {
      db.close();
      throw error;
    }
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
