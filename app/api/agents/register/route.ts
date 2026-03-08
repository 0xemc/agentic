import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { detectChannelType, generateFolderName, getChannelConfig } from '@/lib/core/channels';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jid, name, trigger = '@Barry' } = body;

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
      // Check if already registered
      const existing = db.prepare('SELECT * FROM registered_groups WHERE jid = ?').get(jid);
      if (existing) {
        db.close();
        return NextResponse.json(
          { error: 'Group already registered' },
          { status: 409 }
        );
      }

      // Insert into registered_groups
      const stmt = db.prepare(`
        INSERT INTO registered_groups (jid, name, folder, trigger_pattern, added_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const addedAt = new Date().toISOString();
      stmt.run(jid, name, folder, trigger, addedAt);

      db.close();

      // Create group folder
      const groupsPath = process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups';
      const groupFolderPath = path.join(groupsPath, folder);

      try {
        await fs.mkdir(groupFolderPath, { recursive: true });
        await fs.mkdir(path.join(groupFolderPath, 'logs'), { recursive: true });
        await fs.mkdir(path.join(groupFolderPath, 'conversations'), { recursive: true });

        // Create initial CLAUDE.md
        const claudeMd = `# ${name}

You are Barry, a personal assistant for the ${name} ${channelConfig.name} group.

## Context

This is a ${channelConfig.name} group. Follow the general instructions from the global CLAUDE.md.

## Memory

Use this file to remember important context about this group and its members.
`;

        await fs.writeFile(path.join(groupFolderPath, 'CLAUDE.md'), claudeMd, 'utf-8');
      } catch (err) {
        console.error('Error creating group folder:', err);
        // Non-fatal - continue even if folder creation fails
      }

      return NextResponse.json({
        success: true,
        group: {
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
    console.error('Error registering group:', error);
    return NextResponse.json(
      { error: 'Failed to register group', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
