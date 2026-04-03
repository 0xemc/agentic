import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { detectChannelType, generateFolderName, getChannelConfig } from '@/lib/core/channels';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jid, name, trigger = '' } = body;

    if (!jid || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: jid and name' },
        { status: 400 }
      );
    }

    // Detect channel type and generate folder name
    const channelType = detectChannelType(jid);
    const channelConfig = getChannelConfig(channelType);
    const folder = generateFolderName(channelType, name);

    // Open database
    const dbPath = process.env.NANOCLAW_DB_PATH || '/workspace/project/store/messages.db';
    const db = new Database(dbPath);

    try {
      // Check if already registered by JID
      const existingJid = db.prepare('SELECT * FROM registered_groups WHERE jid = ?').get(jid);
      if (existingJid) {
        db.close();
        return NextResponse.json(
          { error: 'This conversation is already connected to an agent' },
          { status: 409 }
        );
      }

      // Check if folder name is already taken
      const existingFolder = db.prepare('SELECT * FROM registered_groups WHERE folder = ?').get(folder);
      if (existingFolder) {
        db.close();
        return NextResponse.json(
          { error: 'An agent with this name already exists' },
          { status: 409 }
        );
      }

      const addedAt = new Date().toISOString();
      // If no trigger word provided, set requires_trigger to 0
      const requiresTrigger = !trigger || !trigger.trim() ? 0 : 1;

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

This agent is connected to a ${channelConfig.name} conversation. Follow the general instructions from the global CLAUDE.md.

## Memory

Use this file to remember important context about this agent and its users.
`;

      await fs.writeFile(path.join(groupFolderPath, 'CLAUDE.md'), claudeMd, 'utf-8');

      // Folder is ready — now register in DB
      const stmt = db.prepare(`
        INSERT INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(jid, name, folder, trigger || null, addedAt, requiresTrigger);

      db.close();

      return NextResponse.json({
        success: true,
        agent: {
          jid,
          name,
          folder,
          trigger,
          addedAt,
        },
      });
    } catch (error) {
      db.close();
      throw error;
    }
  } catch (error) {
    console.error('Error connecting agent:', error);
    return NextResponse.json(
      { error: 'Failed to connect agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
