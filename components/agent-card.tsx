'use client';

import { Agent } from '@/types/agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

const statusColors = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  error: 'bg-red-500',
  offline: 'bg-gray-500',
};

const statusLabels = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  offline: 'Offline',
};

export function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] relative overflow-hidden"
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className={`absolute top-0 right-0 w-2 h-full ${statusColors[agent.status]}`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {agent.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{agent.type}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
              {statusLabels[agent.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(agent.lastActivity, { addSuffix: true })}
            </span>
          </div>

          {agent.currentTask && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {agent.currentTask}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Messages</span>
            <span className="text-sm font-semibold">{agent.messageCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
