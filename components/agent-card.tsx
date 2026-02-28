'use client';

import { Agent } from '@/types/agent';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, MessageSquare, AlertCircle, Pause, Power, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  index?: number;
}

const statusConfig = {
  active: {
    icon: Activity,
    color: 'text-emerald-400 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/20',
    border: 'border-emerald-500/20 dark:border-emerald-400/30',
    pulse: 'animate-pulse',
    label: 'ACTIVE'
  },
  idle: {
    icon: Pause,
    color: 'text-amber-500 dark:text-yellow-300',
    bg: 'bg-amber-500/10 dark:bg-yellow-400/20',
    border: 'border-amber-500/20 dark:border-yellow-400/30',
    pulse: '',
    label: 'IDLE'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-red-500/20 dark:border-red-500/30',
    pulse: '',
    label: 'ERROR'
  },
  offline: {
    icon: Power,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-500/10 dark:bg-gray-500/20',
    border: 'border-gray-500/20 dark:border-gray-500/30',
    pulse: '',
    label: 'OFFLINE'
  },
};

export function AgentCard({ agent, onClick, index = 0 }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;
  const [logLines, setLogLines] = useState<string[]>([]);

  // Poll for log updates every 2 seconds
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/agents/${agent.id}/logs?lines=3`);
        if (response.ok) {
          const data = await response.json();
          setLogLines(data.lines || []);
        }
      } catch (error) {
        // Silently fail - logs are optional
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [agent.id]);

  return (
    <Card
      className="group relative cursor-pointer border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 overflow-hidden"
      onClick={onClick}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeInUp 0.5s ease-out forwards',
        opacity: 0,
      }}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${status.bg} ${status.border} border-t-2`} />

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Avatar with status indicator */}
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-mono text-sm font-bold text-primary">
                {agent.name.substring(0, 2).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${status.bg} border-2 border-background flex items-center justify-center ${status.pulse}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text-', 'bg-')}`} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate mb-0.5 group-hover:text-primary transition-colors">
                {agent.name}
              </h3>
              <p className="text-xs text-muted-foreground/80 font-mono uppercase tracking-wider">
                {agent.type}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${status.bg} ${status.border} border`}>
            <StatusIcon className={`w-3 h-3 ${status.color}`} />
            <span className={`text-[10px] font-mono font-bold tracking-wide ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Current Task */}
        {agent.currentTask && (
          <div className="mb-4 p-3 rounded-md bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
              {agent.currentTask}
            </p>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Last Activity */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-background/50 border border-border/30">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-muted/50">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wide mb-0.5">
                Activity
              </p>
              <p className="text-xs font-medium truncate">
                {formatDistanceToNow(agent.lastActivity, { addSuffix: true }).replace('about ', '')}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-background/50 border border-border/30">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-muted/50">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wide mb-0.5">
                Messages
              </p>
              <p className="text-sm font-mono font-bold tabular-nums">
                {agent.messageCount}
              </p>
            </div>
          </div>
        </div>

        {/* Agent Output */}
        {logLines.length > 0 && (
          <div className="rounded-md bg-black/50 border border-border/30 p-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-muted-foreground/80 font-mono uppercase tracking-wider">
                Live Output
              </span>
            </div>
            <div className="space-y-0.5 font-mono text-[10px] leading-tight">
              {logLines.map((line, i) => (
                <div key={i} className="text-emerald-400/90 truncate">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom hover indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}
