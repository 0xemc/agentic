/**
 * NanoClaw Adapter for Agentic
 *
 * Connects to NanoClaw's database to read agent contexts and conversation history.
 */

import { AgenticAdapter, AgentContext, AgentMessage, AgentStatus } from '../core/types';
import { NanoClawDB, getStatus } from './nanoclaw-db';
import fs from 'fs/promises';
import path from 'path';

export interface NanoClawConfig {
  /**
   * Path to NanoClaw's groups directory
   */
  groupsPath: string;

  /**
   * Path to NanoClaw's database
   */
  databasePath?: string;

  /**
   * Polling interval for updates (ms)
   */
  pollInterval?: number;
}

export class NanoClawAdapter implements AgenticAdapter {
  readonly name = 'nanoclaw';
  private config: NanoClawConfig;
  private connected = false;
  private pollTimer?: NodeJS.Timeout;
  private contextUpdateCallbacks: Set<(context: AgentContext) => void> = new Set();
  private messageCallbacks: Set<(message: AgentMessage) => void> = new Set();
  private lastPoll = new Map<string, Date>();
  private db: NanoClawDB | null = null;

  constructor(config: NanoClawConfig) {
    this.config = {
      pollInterval: 5000,
      databasePath: '/workspace/project/store/messages.db',
      ...config,
    };
  }

  async connect(): Promise<void> {
    // Verify database exists
    try {
      console.log('[NanoClawAdapter] Attempting to connect to database:', this.config.databasePath);
      await fs.access(this.config.databasePath!);
      console.log('[NanoClawAdapter] Database file exists, creating DB instance');
      this.db = new NanoClawDB(this.config.databasePath!);
      console.log('[NanoClawAdapter] Successfully connected to database');
    } catch (error) {
      console.error('[NanoClawAdapter] Failed to connect to database:', error);
      console.error('[NanoClawAdapter] Database path attempted:', this.config.databasePath);
      console.error('[NanoClawAdapter] Error details:', error instanceof Error ? error.message : String(error));
      throw new Error(`NanoClaw database not found: ${this.config.databasePath} (${error instanceof Error ? error.message : String(error)})`);
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
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.connected = false;
  }

  async getContexts(): Promise<AgentContext[]> {
    if (!this.connected || !this.db) {
      throw new Error('Adapter not connected');
    }

    const contexts: AgentContext[] = [];
    const registeredGroups = this.db.getRegisteredGroups();

    for (const group of registeredGroups) {
      try {
        const lastActivity = this.db.getLastActivity(group.jid);
        const messageCount = this.db.getMessageCount(group.jid);

        // Use real-time container status detection
        const status = await this.getContextStatus(group.folder);

        contexts.push({
          id: group.folder,
          name: group.name,
          status,
          type: 'NanoClaw',
          lastActivity,
          messageCount,
          metadata: {
            jid: group.jid,
            folder: group.folder,
            adapter: 'nanoclaw',
            trigger: group.trigger_pattern,
          },
        });
      } catch (error) {
        console.error(`Error parsing group ${group.name}:`, error);
      }
    }

    return contexts;
  }

  async getContext(id: string): Promise<AgentContext | null> {
    const contexts = await this.getContexts();
    return contexts.find((c) => c.id === id) || null;
  }

  async getMessages(contextId: string, limit = 100): Promise<AgentMessage[]> {
    if (!this.connected || !this.db) {
      throw new Error('Adapter not connected');
    }

    // Find the JID for this context
    const context = await this.getContext(contextId);
    if (!context || !context.metadata?.jid) {
      return [];
    }

    return this.db.getMessages(context.metadata.jid as string, limit);
  }

  async sendMessage(contextId: string, content: string): Promise<AgentMessage> {
    // NanoClaw adapter is read-only for now
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

  async getContextStatus(contextId: string): Promise<AgentStatus> {
    if (!this.connected || !this.db) {
      throw new Error('Adapter not connected');
    }

    // The contextId IS the folder name, so use it directly
    const folder = contextId;
    const logsPath = path.join(this.config.groupsPath, folder, 'logs');

    try {
      // Check if logs directory exists
      const files = await fs.readdir(logsPath);
      const logFiles = files.filter((f) => f.startsWith('container-') && f.endsWith('.log'));

      if (logFiles.length === 0) {
        return 'offline';
      }

      // Get the most recent log file
      const logFilePaths = logFiles.map((f) => path.join(logsPath, f));
      const stats = await Promise.all(logFilePaths.map((f) => fs.stat(f)));

      // Find the most recently modified log file
      let mostRecentTime = 0;
      for (const stat of stats) {
        const mtime = stat.mtimeMs;
        if (mtime > mostRecentTime) {
          mostRecentTime = mtime;
        }
      }

      const lastModified = new Date(mostRecentTime);
      const secondsSinceActivity = (Date.now() - lastModified.getTime()) / 1000;

      // Active: modified within last 30 seconds
      if (secondsSinceActivity < 30) {
        return 'active';
      }

      // Idle: modified within last 5 minutes
      if (secondsSinceActivity < 300) {
        return 'idle';
      }

      // Otherwise offline
      return 'offline';
    } catch (error) {
      // If we can't read logs, return offline
      return 'offline';
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
