export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  type: string;
  lastActivity: Date;
  currentTask?: string;
  messageCount: number;
  avatar?: string;
}

export interface Message {
  id: string;
  agentId: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface Context {
  agentId: string;
  messages: Message[];
  metadata: {
    created: Date;
    updated: Date;
  };
}
