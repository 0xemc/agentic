/**
 * NanoClaw Database Reader
 *
 * Reads from NanoClaw's SQLite database
 */

import Database from 'better-sqlite3';
import { AgentMessage, AgentStatus } from '../core/types';

export interface NanoClawDBMessage {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: boolean;
  is_bot_message: boolean;
}

export interface NanoClawRegisteredGroup {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern?: string;
  added_at: string;
  container_config?: string;
  requires_trigger?: number;
}

export class NanoClawDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  getRegisteredGroups(): NanoClawRegisteredGroup[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM registered_groups');
      return stmt.all() as NanoClawRegisteredGroup[];
    } catch (error) {
      console.error('Error reading registered_groups:', error);
      return [];
    }
  }

  getMessages(chatJid: string, limit = 100): AgentMessage[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, chat_jid, sender, sender_name, content, timestamp, is_from_me, is_bot_message
        FROM messages
        WHERE chat_jid = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(chatJid, limit) as NanoClawDBMessage[];

      return rows.reverse().map((row) => ({
        id: row.id,
        contextId: row.chat_jid,
        // is_bot_message = agent response, !is_from_me && !is_bot_message = user message
        sender: row.is_bot_message ? 'agent' : 'user',
        content: row.content,
        timestamp: new Date(row.timestamp),
        metadata: {
          sender_name: row.sender_name,
          is_from_me: row.is_from_me,
          is_bot_message: row.is_bot_message,
        },
      }));
    } catch (error) {
      console.error('Error reading messages from DB:', error);
      return [];
    }
  }

  getMessageCount(chatJid: string): number {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE chat_jid = ?');
      const result = stmt.get(chatJid) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error counting messages:', error);
      return 0;
    }
  }

  getLastActivity(chatJid: string): Date {
    try {
      const stmt = this.db.prepare(`
        SELECT timestamp
        FROM messages
        WHERE chat_jid = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      const result = stmt.get(chatJid) as { timestamp: string } | undefined;
      return result ? new Date(result.timestamp) : new Date(0);
    } catch (error) {
      console.error('Error getting last activity:', error);
      return new Date(0);
    }
  }

  close() {
    this.db.close();
  }
}

export function getStatus(lastActivity: Date): AgentStatus {
  const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);

  if (hoursSinceActivity < 1) {
    return 'active';
  } else if (hoursSinceActivity < 24) {
    return 'idle';
  }

  return 'offline';
}
