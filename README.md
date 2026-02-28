# Agentic - Framework-Agnostic Mission Control

A modern, framework-agnostic dashboard for managing and interacting with AI agents. Built with a clean adapter pattern that allows integration with any agent framework or tool.

## 🏗️ Architecture

Agentic uses a **framework-agnostic core** with **pluggable adapters** for different agent systems.

```
┌─────────────────────────────────────┐
│         React UI Layer              │
│   (Framework-agnostic components)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Agentic Manager (Core)         │
│   - Context aggregation             │
│   - Message routing                 │
│   - Event subscription              │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┬─────────────┐
      │                 │             │
┌─────▼──────┐  ┌──────▼──────┐  ┌──▼──────┐
│  NanoClaw  │  │    Mock     │  │  Your   │
│  Adapter   │  │   Adapter   │  │ Adapter │
└────────────┘  └─────────────┘  └─────────┘
```

## 🎯 Features

- **Framework-Agnostic Core**: Works with any agent framework
- **Pluggable Adapters**: Easy integration with NanoClaw, AutoGPT, LangChain, etc.
- **Unified Interface**: Single dashboard for all your agents
- **Real-time Updates**: Live status and message updates
- **Type-Safe**: Full TypeScript support
- **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn/ui

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📦 Built-in Adapters

### Mock Adapter

A demonstration adapter with mock data. Always enabled by default.

```typescript
import { MockAdapter } from '@/lib/adapters/mock';

const mockAdapter = new MockAdapter();
manager.registerAdapter(mockAdapter);
```

### NanoClaw Adapter

Connects to NanoClaw's file-based agent groups.

```typescript
import { NanoClawAdapter } from '@/lib/adapters/nanoclaw';

const nanoClawAdapter = new NanoClawAdapter({
  groupsPath: '/workspace/project/groups',
  pollInterval: 5000, // Poll every 5 seconds
});

manager.registerAdapter(nanoClawAdapter);
```

**Configuration:**

Set environment variables in `.env.local`:

```bash
NEXT_PUBLIC_NANOCLAW_ENABLED=true
NANOCLAW_GROUPS_PATH=/workspace/project/groups
NANOCLAW_POLL_INTERVAL=5000
```

## 🔌 Creating Custom Adapters

Create an adapter for any agent framework by implementing the `AgenticAdapter` interface:

```typescript
import { AgenticAdapter, AgentContext, AgentMessage } from '@/lib/core/types';

export class YourAdapter implements AgenticAdapter {
  readonly name = 'your-adapter';

  async connect(): Promise<void> {
    // Initialize connection
  }

  async disconnect(): Promise<void> {
    // Cleanup
  }

  async getContexts(): Promise<AgentContext[]> {
    // Return all available agent contexts
  }

  async getContext(id: string): Promise<AgentContext | null> {
    // Return specific context
  }

  async getMessages(contextId: string, limit?: number): Promise<AgentMessage[]> {
    // Return messages for a context
  }

  async sendMessage(contextId: string, content: string): Promise<AgentMessage> {
    // Send a message to the agent
  }

  onContextUpdate(callback: (context: AgentContext) => void): () => void {
    // Subscribe to context updates
    return () => {}; // Unsubscribe function
  }

  onMessage(callback: (message: AgentMessage) => void): () => void {
    // Subscribe to new messages
    return () => {}; // Unsubscribe function
  }
}
```

### Register Your Adapter

```typescript
// lib/config/adapters.ts
import { YourAdapter } from '../adapters/your-adapter';

export async function initializeAdapters(manager: AgenticManager): Promise<void> {
  const yourAdapter = new YourAdapter({ /* config */ });
  manager.registerAdapter(yourAdapter);
  
  await manager.connectAll();
}
```

## 📖 Core Types

### AgentContext

Represents an agent or conversation context:

```typescript
interface AgentContext {
  id: string;                      // Unique identifier
  name: string;                    // Display name
  status: AgentStatus;             // active | idle | error | offline
  type: string;                    // Agent type/category
  lastActivity: Date;              // Last activity timestamp
  currentTask?: string;            // Current task description
  messageCount: number;            // Total message count
  metadata?: Record<string, unknown>; // Adapter-specific data
}
```

### AgentMessage

Represents a message in a conversation:

```typescript
interface AgentMessage {
  id: string;                      // Unique message ID
  contextId: string;               // Parent context ID
  sender: 'user' | 'agent' | 'system'; // Message sender
  content: string;                 // Message content
  timestamp: Date;                 // Message timestamp
  metadata?: Record<string, unknown>; // Message metadata
}
```

## 🎨 UI Components

### AgentGrid

Displays agents in a responsive grid:

```tsx
<AgentGrid 
  agents={contexts} 
  onAgentClick={(agent) => setSelected(agent)} 
/>
```

### AgentDialog

Shows conversation with an agent:

```tsx
<AgentDialog
  agent={selectedAgent}
  messages={messages}
  open={isOpen}
  onClose={() => setOpen(false)}
  onSendMessage={(content) => sendMessage(content)}
/>
```

## 🪝 React Hooks

### useAgentic

Main hook for accessing the Agentic manager:

```tsx
const { contexts, loading, error, manager, reload } = useAgentic();
```

### useAgentContext

Hook for interacting with a specific context:

```tsx
const { messages, loading, error, sendMessage, reload } = useAgentContext(contextId);
```

## 🗂️ Project Structure

```
agentic/
├── app/
│   ├── page.tsx              # Main dashboard
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── agent-grid.tsx        # Grid layout
│   ├── agent-card.tsx        # Agent card
│   ├── agent-dialog.tsx      # Conversation dialog
│   └── agentic-provider.tsx  # Context provider
├── lib/
│   ├── core/
│   │   ├── types.ts          # Core type definitions
│   │   └── manager.ts        # AgenticManager
│   ├── adapters/
│   │   ├── mock.ts           # Mock adapter
│   │   └── nanoclaw.ts       # NanoClaw adapter
│   ├── hooks/
│   │   └── useAgentic.ts     # React hooks
│   └── config/
│       └── adapters.ts       # Adapter configuration
└── types/
    └── agent.ts              # UI-compatible types
```

## 🔧 Configuration

### Environment Variables

```bash
# NanoClaw Integration
NEXT_PUBLIC_NANOCLAW_ENABLED=true
NANOCLAW_GROUPS_PATH=/workspace/project/groups
NANOCLAW_POLL_INTERVAL=5000

# Mock Adapter
NEXT_PUBLIC_MOCK_ENABLED=true
```

## 🛣️ Roadmap

- [ ] LangChain adapter
- [ ] AutoGPT adapter  
- [ ] CrewAI adapter
- [ ] WebSocket support for real-time updates
- [ ] Agent creation UI
- [ ] Agent configuration management
- [ ] Metrics and analytics dashboard

## 📄 License

MIT

## 🤝 Contributing

Adapters for new frameworks are welcome! See [Creating Custom Adapters](#creating-custom-adapters) above.
