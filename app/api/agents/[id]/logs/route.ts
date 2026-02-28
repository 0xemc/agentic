import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const lines = parseInt(url.searchParams.get('lines') || '3', 10);

    // Map folder ID to actual group folder path
    const groupsBasePath = process.env.NANOCLAW_GROUPS_PATH || '/workspace/project/groups';
    const logsPath = path.join(groupsBasePath, id, 'logs');

    // Get all log files
    const files = await fs.readdir(logsPath);
    const logFiles = files
      .filter(f => f.startsWith('container-') && f.endsWith('.log'))
      .sort()
      .reverse(); // Most recent first

    if (logFiles.length === 0) {
      return NextResponse.json({ lines: [], latest: null });
    }

    // Read the most recent log file
    const latestLogPath = path.join(logsPath, logFiles[0]);
    const content = await fs.readFile(latestLogPath, 'utf-8');

    // Get last N lines
    const allLines = content.split('\n').filter(line => line.trim().length > 0);
    const lastLines = allLines.slice(-lines);

    return NextResponse.json({
      lines: lastLines,
      latest: logFiles[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reading agent logs:', error);
    return NextResponse.json(
      { error: 'Failed to read logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
