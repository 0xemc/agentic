/**
 * Channel types and utilities for multi-platform messaging support
 */

export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'signal' | 'web' | 'unknown';

export interface ChannelConfig {
  type: ChannelType;
  name: string;
  icon: string;
  color: string;
  jidPattern?: RegExp;
}

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  whatsapp: {
    type: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    jidPattern: /@(s\.whatsapp\.net|g\.us)$/,
  },
  telegram: {
    type: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: '#0088cc',
    jidPattern: /^tg:/,
  },
  discord: {
    type: 'discord',
    name: 'Discord',
    icon: '💙',
    color: '#5865F2',
    jidPattern: /^dc:/,
  },
  slack: {
    type: 'slack',
    name: 'Slack',
    icon: '💼',
    color: '#4A154B',
    jidPattern: /^slack:/,
  },
  signal: {
    type: 'signal',
    name: 'Signal',
    icon: '🔒',
    color: '#3A76F0',
    jidPattern: /^signal:/,
  },
  web: {
    type: 'web',
    name: 'Web',
    icon: '🌐',
    color: '#6366f1',
    jidPattern: /^web:/,
  },
  unknown: {
    type: 'unknown',
    name: 'Unknown',
    icon: '❓',
    color: '#6b7280',
  },
};

/**
 * Detect channel type from JID
 */
export function detectChannelType(jid: string): ChannelType {
  for (const [type, config] of Object.entries(CHANNEL_CONFIGS)) {
    if (config.jidPattern && config.jidPattern.test(jid)) {
      return type as ChannelType;
    }
  }
  return 'unknown';
}

/**
 * Get channel config for a given JID or type
 */
export function getChannelConfig(jidOrType: string): ChannelConfig {
  // If it's a known channel type, return directly
  if (jidOrType in CHANNEL_CONFIGS) {
    return CHANNEL_CONFIGS[jidOrType as ChannelType];
  }

  // Otherwise, detect from JID
  const channelType = detectChannelType(jidOrType);
  return CHANNEL_CONFIGS[channelType];
}

/**
 * Generate folder name from channel and group name
 */
export function generateFolderName(channelType: ChannelType, groupName: string): string {
  const sanitizedName = groupName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${channelType}_${sanitizedName}`;
}

/**
 * Parse folder name to extract channel and group name
 */
export function parseFolderName(folderName: string): { channel: ChannelType; name: string } {
  const parts = folderName.split('_');

  if (parts.length < 2) {
    return { channel: 'unknown', name: folderName };
  }

  const channelType = parts[0] as ChannelType;
  const name = parts.slice(1).join('_');

  return {
    channel: CHANNEL_CONFIGS[channelType] ? channelType : 'unknown',
    name,
  };
}
