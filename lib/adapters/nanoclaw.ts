/**
 * NanoClaw Adapter for Agentic
 *
 * Connects to NanoClaw's database and file system to read agent contexts
 * and conversation history.
 */

import { AgenticAdapter, AgentContext, AgentMessage, AgentStatus } from '../core/types';
import fs from 'fs/promises';
import path from 'path';

export interface NanoClawConfig {
  /**
   * Path to NanoClaw's groups directory
   */
  groupsPath: string;

  /**
   * Path to NanoClaw's database (optional)
   */
  databasePath?: string;

  /**
   * Polling interval for updates (ms)
   */
  pollInterval?: number;
}

interface NanoClawGroupConfig {
  name: string;
  folder: string;
  trigger?: string;
  requiresTrigger?: boolean;
  added_at?: string;
}

export class NanoClawAdapter implements AgenticAdapter {
  readonly name = 'nanoclaw';
  private config: NanoClawConfig;
  private connected = false;
  private pollTimer?: NodeJS.Timeout;
  private contextUpdateCallbacks: Set<(context: AgentContext) => void> = new Set();
  private messageCallbacks: Set<(message: AgentMessage) => void> = new Set();
  private lastPoll = new Map<string, Date>();

  constructor(config: NanoClawConfig) {
    this.config = {
      pollInterval: 5000, // Default 5 seconds
      ...config,
    };
  }

  async connect(): Promise<void> {
    // Verify paths exist
    try {
      await fs.access(this.config.groupsPath);
    } catch (error) {
      throw new Error(`NanoClaw groups path not found: ${this.config.groupsPath}`);
    }

    this.connected = true;

    // Start polling for updates
    if (this.config.pollInterval && this.config.pollInterval > 0) {
      this.pollTimer = setInterval(() => this.pollForUpdates(), this.config.pollInterval);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.connected = false;
  }

  async getContexts(): Promise<AgentContext[]> {
    if (!this.connected) {
      throw new Error('Adapter not connected');
    }

    const contexts: AgentContext[] = [];

    // Read all group directories
    const entries = await fs.readdir(this.config.groupsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const groupPath = path.join(this.config.groupsPath, entry.name);

      try {
        const context = await this.parseGroupContext(entry.name, groupPath);
        if (context) {
          contexts.push(context);
        }
      } catch (error) {
        console.error(`Error parsing group ${entry.name}:`, error);
      }
    }

    return contexts;
  }

  async getContext(id: string): Promise<AgentContext | null> {
    const groupPath = path.join(this.config.groupsPath, id);

    try {
      await fs.access(groupPath);
      return this.parseGroupContext(id, groupPath);
    } catch {
      return null;
    }
  }

  async getMessages(contextId: string, limit?: number): Promise<AgentMessage[]> {
    const conversationsPath = path.join(this.config.groupsPath, contextId, 'conversations');

    try {
      // Read conversation files
      const files = await fs.readdir(conversationsPath);
      const messages: AgentMessage[] = [];

      // Sort files by date (newest first)
      files.sort().reverse();

      const filesToRead = limit ? files.slice(0, Math.ceil(limit / 10)) : files;

      for (const file of filesToRead) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = path.join(conversationsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);

            // Parse message from conversation entry
            if (entry.type === 'message' && entry.message) {
              messages.push({
                id: entry.id || `${Date.now()}-${Math.random()}`,
                contextId,
                sender: entry.message.role === 'user' ? 'user' : 'agent',
                content: entry.message.content || '',
                timestamp: new Date(entry.timestamp),
                metadata: {
                  role: entry.message.role,
                  model: entry.message.model,
                },
              });
            }
          } catch (error) {
            // Skip malformed lines
            continue;
          }
        }
      }

      // Sort by timestamp and apply limit
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return limit ? messages.slice(-limit) : messages;
    } catch (error) {
      console.error(`Error reading messages for ${contextId}:`, error);
      return [];
    }
  }

  async sendMessage(contextId: string, content: string): Promise<AgentMessage> {
    // NanoClaw adapter is read-only for now
    // To send messages, you would need to implement the IPC protocol
    throw new Error('Sending messages not yet implemented for NanoClaw adapter');
  }

  onContextUpdate(callback: (context: AgentContext) => void): () => void {
    this.contextUpdateCallbacks.add(callback);
    return () => this.contextUpdateCallbacks.delete(callback);
  }

  onMessage(callback: (message: AgentMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  private async parseGroupContext(folder: string, groupPath: string): Promise<AgentContext | null> {
    try {
      // Try to read CLAUDE.md for context info
      let name = folder;
      let type = 'NanoClaw Group';

      const claudeMdPath = path.join(groupPath, 'CLAUDE.md');
      try {
        const claudeMd = await fs.readFile(claudeMdPath, 'utf-8');
        // Extract title from first line
        const firstLine = claudeMd.split('\n')[0];
        if (firstLine.startsWith('#')) {
          name = firstLine.replace(/^#+\s*/, '').trim();
        }
      } catch {
        // CLAUDE.md doesn't exist or can't be read
      }

      // Get last activity from conversations directory
      const conversationsPath = path.join(groupPath, 'conversations');
      let lastActivity = new Date(0);
      let messageCount = 0;

      try {
        const files = await fs.readdir(conversationsPath);

        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue;

          const filePath = path.join(conversationsPath, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime > lastActivity) {
            lastActivity = stats.mtime;
          }

          // Quick count of messages
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n').filter(l => l.trim());
          messageCount += lines.length;
        }
      } catch {
        // No conversations directory
      }

      // Determine status based on last activity
      const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
      let status: AgentStatus = 'offline';

      if (hoursSinceActivity < 1) {
        status = 'active';
      } else if (hoursSinceActivity < 24) {
        status = 'idle';
      }

      return {
        id: folder,
        name,
        status,
        type,
        lastActivity,
        messageCount,
        metadata: {
          groupPath,
          adapter: 'nanoclaw',
        },
      };
    } catch (error) {
      console.error(`Error parsing group context for ${folder}:`, error);
      return null;
    }
  }

  private async pollForUpdates(): Promise<void> {
    try {
      const contexts = await this.getContexts();

      for (const context of contexts) {
        const lastPoll = this.lastPoll.get(context.id);

        // If this is a new context or activity changed, notify listeners
        if (!lastPoll || context.lastActivity > lastPoll) {
          this.lastPoll.set(context.id, context.lastActivity);
          this.contextUpdateCallbacks.forEach((cb) => cb(context));
        }
      }
    } catch (error) {
      console.error('Error polling for updates:', error);
    }
  }
}
