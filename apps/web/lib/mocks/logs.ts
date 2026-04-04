export const MOCK_LOGS: Record<string, string[]> = {
  'mock-1': [
    '[2026-03-06 10:01:23] Fetching market data from financial APIs...',
    '[2026-03-06 10:03:11] Processing Q1 2026 trend analysis — 847 data points ingested',
    '[2026-03-06 10:05:44] Analysis complete: +15% renewable energy investments detected',
  ],
  'mock-2': [
    '[2026-03-06 09:30:00] Idle — watching for new pull requests on GitHub',
    '[2026-03-06 09:30:05] Polling interval: 30s',
    '[2026-03-06 09:30:35] No new PRs found',
  ],
  'mock-3': [
    '[2026-03-06 10:08:02] Loading customer behavior dataset (1.2M rows)',
    '[2026-03-06 10:09:17] Running segmentation model — batch 3/8',
    '[2026-03-06 10:10:55] Cluster analysis in progress...',
  ],
};

export function getMockLogs(id: string, lines: number): string[] {
  return (MOCK_LOGS[id] ?? [`[mock] Agent ${id} is running`]).slice(-lines);
}
