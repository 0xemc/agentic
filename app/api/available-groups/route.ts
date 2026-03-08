import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { detectChannelType, getChannelConfig } from '@/lib/core/channels';

export async function GET() {
  try {
    const availableGroupsPath = '/workspace/ipc/available_groups.json';

    try {
      const data = await fs.readFile(availableGroupsPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Enhance groups with channel information
      const enhancedGroups = (parsed.groups || []).map((group: any) => {
        const channelType = detectChannelType(group.jid);
        const channelConfig = getChannelConfig(channelType);

        return {
          ...group,
          channel: {
            type: channelType,
            name: channelConfig.name,
            icon: channelConfig.icon,
            color: channelConfig.color,
          },
        };
      });

      return NextResponse.json({
        ...parsed,
        groups: enhancedGroups,
      });
    } catch (error) {
      console.error('Error reading available_groups.json:', error);
      return NextResponse.json({
        groups: [],
        lastSync: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error fetching available groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available groups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Trigger a refresh of available groups
    const taskPath = `/workspace/ipc/tasks/refresh_${Date.now()}.json`;
    await fs.writeFile(taskPath, JSON.stringify({ type: 'refresh_groups' }), 'utf-8');

    return NextResponse.json({ success: true, message: 'Refresh requested' });
  } catch (error) {
    console.error('Error requesting group refresh:', error);
    return NextResponse.json(
      { error: 'Failed to request refresh', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
