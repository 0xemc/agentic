const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root — two levels up from apps/mobile
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Watch the shared packages directory so Metro picks up @agentic/core changes
config.watchFolders = [monorepoRoot];

// Resolve modules from the mobile app first, then fall back to monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
