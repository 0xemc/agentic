# Plan: Real-Time Agent Status Tracking (Option 2)

**Goal:** Display accurate, real-time agent processing stages in the Agentic dashboard by integrating with NanoClaw's agent execution pipeline.

**Status Stages:**
1. ✓ **Message Received** - User message detected in database
2. 💭 **Processing** - Agent container is running/processing
3. ⚙️ **Thinking** - Agent is in internal reasoning mode (`<internal>` tags)
4. ✅ **Responding** - Agent has generated response, sending to user

---

## Architecture Overview

```
User sends message → NanoClaw → Agent Container → Status Updates → SSE → Dashboard
                        ↓
                  Status Events Emitted
                        ↓
                  WebSocket/SSE Endpoint
                        ↓
                  Agentic Dashboard
```

---

## Phase 1: NanoClaw Modifications

### 1.1 Add Status Event Emitter

**File:** `src/lib/statusEmitter.ts` (new)

```typescript
import EventEmitter from 'events';

export type AgentStatus =
  | 'received'    // Message received, queued for processing
  | 'processing'  // Container started, agent running
  | 'thinking'    // Agent in internal reasoning (<internal> tags)
  | 'responding'  // Agent generated response, sending back
  | 'complete'    // Response sent successfully
  | 'error';      // Error occurred

export interface StatusEvent {
  chatJid: string;
  folder: string;
  status: AgentStatus;
  timestamp: string;
  metadata?: {
    thinking?: boolean;
    toolUse?: string;
    error?: string;
  };
}

class StatusEmitter extends EventEmitter {
  emit(event: 'status', data: StatusEvent): boolean;
  on(event: 'status', listener: (data: StatusEvent) => void): this;
}

export const statusEmitter = new StatusEmitter();
```

**Usage:**
```typescript
statusEmitter.emit('status', {
  chatJid: '1234@g.us',
  folder: 'main',
  status: 'processing',
  timestamp: new Date().toISOString()
});
```

---

### 1.2 Instrument GroupQueue Class

**File:** `src/lib/groupQueue.ts`

**Add status emissions at key points:**

```typescript
class GroupQueue {
  async processMessage(chatJid: string, message: Message) {
    // EMIT: Message received
    statusEmitter.emit('status', {
      chatJid,
      folder: this.getFolder(chatJid),
      status: 'received',
      timestamp: new Date().toISOString()
    });

    try {
      // Start container
      const container = await this.startContainer(chatJid);

      // EMIT: Processing started
      statusEmitter.emit('status', {
        chatJid,
        folder: this.getFolder(chatJid),
        status: 'processing',
        timestamp: new Date().toISOString()
      });

      // Run agent
      const response = await this.runAgent(container, message);

      // EMIT: Responding
      statusEmitter.emit('status', {
        chatJid,
        folder: this.getFolder(chatJid),
        status: 'responding',
        timestamp: new Date().toISOString()
      });

      // Send response
      await this.sendResponse(chatJid, response);

      // EMIT: Complete
      statusEmitter.emit('status', {
        chatJid,
        folder: this.getFolder(chatJid),
        status: 'complete',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // EMIT: Error
      statusEmitter.emit('status', {
        chatJid,
        folder: this.getFolder(chatJid),
        status: 'error',
        timestamp: new Date().toISOString(),
        metadata: { error: error.message }
      });
    }
  }
}
```

---

### 1.3 Detect "Thinking" State

**File:** `src/lib/agentRunner.ts` (or wherever agent output is processed)

**Parse agent output stream for `<internal>` tags:**

```typescript
class AgentRunner {
  async runAgent(container: Container, message: string) {
    const output = container.exec(['claude', '--message', message]);

    let inInternalBlock = false;

    for await (const chunk of output) {
      const text = chunk.toString();

      // Detect <internal> opening tag
      if (text.includes('<internal>')) {
        inInternalBlock = true;

        // EMIT: Thinking
        statusEmitter.emit('status', {
          chatJid: this.chatJid,
          folder: this.folder,
          status: 'thinking',
          timestamp: new Date().toISOString(),
          metadata: { thinking: true }
        });
      }

      // Detect </internal> closing tag
      if (text.includes('</internal>')) {
        inInternalBlock = false;

        // EMIT: Processing (back to normal processing)
        statusEmitter.emit('status', {
          chatJid: this.chatJid,
          folder: this.folder,
          status: 'processing',
          timestamp: new Date().toISOString(),
          metadata: { thinking: false }
        });
      }

      // Accumulate response
      response += text;
    }

    return response;
  }
}
```

---

### 1.4 Create SSE Status Endpoint

**File:** `src/routes/status.ts` (new)

```typescript
import { FastifyInstance } from 'fastify';
import { statusEmitter, StatusEvent } from '../lib/statusEmitter';

export async function statusRoutes(fastify: FastifyInstance) {
  // SSE endpoint for status updates
  fastify.get('/api/status/stream/:folder', async (request, reply) => {
    const { folder } = request.params as { folder: string };

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection event
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Listen for status events for this folder
    const listener = (event: StatusEvent) => {
      if (event.folder === folder) {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    statusEmitter.on('status', listener);

    // Heartbeat
    const heartbeat = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 30000);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      statusEmitter.off('status', listener);
      clearInterval(heartbeat);
      reply.raw.end();
    });
  });

  // REST endpoint to get current status
  fastify.get('/api/status/:folder', async (request, reply) => {
    const { folder } = request.params as { folder: string };

    // Query current container state
    const container = await this.getContainer(folder);
    const isRunning = await container?.isRunning();

    return {
      folder,
      status: isRunning ? 'processing' : 'idle',
      timestamp: new Date().toISOString()
    };
  });
}
```

**Register routes:**

```typescript
// src/index.ts
import { statusRoutes } from './routes/status';

await app.register(statusRoutes);
```

---

## Phase 2: Agentic Dashboard Integration

### 2.1 Create Status Hook

**File:** `lib/hooks/useAgentStatus.ts` (new)

```typescript
import { useState, useEffect } from 'react';
import { useSSE } from './useSSE';

export type AgentStatusStage = 'idle' | 'received' | 'processing' | 'thinking' | 'responding';

export function useAgentStatus(contextId: string | null) {
  const [status, setStatus] = useState<AgentStatusStage>('idle');
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  useSSE({
    url: `/api/status/stream/${contextId}`,
    enabled: !!contextId,
    onMessage: (data) => {
      if (data.status) {
        setStatus(data.status);
        setMetadata(data.metadata || {});
      }
    }
  });

  return { status, metadata };
}
```

---

### 2.2 Update TypingIndicator Component

**File:** `components/typing-indicator.tsx`

```typescript
interface TypingIndicatorProps {
  agentName: string;
  status: AgentStatusStage; // Pass actual status instead of cycling
  onDismiss?: () => void;
}

const stageConfig: Record<AgentStatusStage, { message: string; icon: string }> = {
  idle: { message: 'Idle', icon: '⚪' },
  received: { message: 'Message received...', icon: '✓' },
  processing: { message: 'Processing...', icon: '⚙️' },
  thinking: { message: 'Thinking...', icon: '💭' },
  responding: { message: 'Responding...', icon: '✍️' },
};

export function TypingIndicator({ agentName, status, onDismiss }: TypingIndicatorProps) {
  const currentStage = stageConfig[status];

  return (
    <div className="flex flex-col items-start group/typing">
      {/* ... existing markup ... */}
      <span className="text-base">{currentStage.icon}</span>
      <span className="text-sm text-muted-foreground italic">
        {currentStage.message}
      </span>
      {/* ... dots animation ... */}
    </div>
  );
}
```

---

### 2.3 Update useAgentContext Hook

**File:** `lib/hooks/useAgentic.ts`

```typescript
import { useAgentStatus } from './useAgentStatus';

export function useAgentContext(contextId: string | null) {
  // ... existing code ...
  const { status: agentStatus } = useAgentStatus(contextId);
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  // Show typing indicator when status is not idle
  useEffect(() => {
    if (['received', 'processing', 'thinking', 'responding'].includes(agentStatus)) {
      setIsAgentTyping(true);
    } else {
      setIsAgentTyping(false);
    }
  }, [agentStatus]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    reload: loadMessages,
    isAgentTyping,
    agentStatus, // Expose actual status
    dismissTypingIndicator,
  };
}
```

---

### 2.4 Update AgentSidebar

**File:** `components/agent-sidebar.tsx`

```typescript
export function AgentSidebar({
  agent,
  messages,
  open,
  onClose,
  onSendMessage,
  isAgentTyping = false,
  agentStatus = 'idle', // Add new prop
  onDismissTyping,
}: AgentSidebarProps) {
  // ... existing code ...

  {isAgentTyping && (
    <TypingIndicator
      agentName={agent.name}
      status={agentStatus} // Pass real status
      onDismiss={onDismissTyping}
    />
  )}
}
```

---

## Phase 3: Configuration & Deployment

### 3.1 Environment Variables

**NanoClaw `.env`:**
```bash
# Enable status streaming
ENABLE_STATUS_STREAM=true

# Status stream port (if different from main app)
STATUS_STREAM_PORT=3001
```

**Agentic `.env.local`:**
```bash
# NanoClaw status stream endpoint
NEXT_PUBLIC_STATUS_STREAM_URL=http://localhost:3001
```

---

### 3.2 Nginx Configuration (if using proxy)

```nginx
# Proxy status stream
location /api/status/ {
  proxy_pass http://localhost:3001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;

  # SSE specific
  proxy_buffering off;
  proxy_read_timeout 86400s;
  proxy_send_timeout 86400s;
}
```

---

## Phase 4: Testing Strategy

### 4.1 Unit Tests

**NanoClaw:**
- Test `statusEmitter` emits correct events
- Test `<internal>` tag detection
- Test status transitions (received → processing → thinking → responding)

**Agentic:**
- Test `useAgentStatus` hook subscribes correctly
- Test `TypingIndicator` displays correct stage
- Test auto-hide on completion

---

### 4.2 Integration Tests

1. Send message to agent
2. Verify status progression:
   - ✓ received
   - ⚙️ processing
   - 💭 thinking (if agent uses `<internal>`)
   - ✍️ responding
   - Hide indicator when complete

---

### 4.3 Edge Cases

- **Container crash** - Emit 'error' status
- **Long-running tasks** - Keep status active
- **Multiple concurrent messages** - Track per-message status
- **Network disconnect** - Reconnect SSE stream
- **Agent timeout** - Emit 'error' after timeout

---

## Phase 5: Rollout Plan

### Week 1: NanoClaw Instrumentation
- [ ] Create `statusEmitter` module
- [ ] Instrument `GroupQueue` class
- [ ] Add `<internal>` tag detection
- [ ] Create SSE status endpoint
- [ ] Test locally

### Week 2: Agentic Integration
- [ ] Create `useAgentStatus` hook
- [ ] Update `TypingIndicator` component
- [ ] Update `useAgentContext` hook
- [ ] Update `AgentSidebar` component
- [ ] Test integration

### Week 3: Polish & Testing
- [ ] Add error handling
- [ ] Add reconnection logic
- [ ] Write tests
- [ ] Documentation
- [ ] Performance testing

### Week 4: Deployment
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor metrics

---

## Success Metrics

- ✅ Status updates appear within **< 500ms** of actual state change
- ✅ "Thinking" state detected **100%** of the time when `<internal>` tags used
- ✅ Zero false positives (showing status when agent not running)
- ✅ SSE connection stable for **> 1 hour** continuous usage
- ✅ User satisfaction with real-time feedback

---

## Alternative: Lightweight Version

If full NanoClaw modification is too complex, consider:

### Minimal Changes:
1. **Only add status endpoint** (skip full instrumentation)
2. **Poll container state** every 2 seconds instead of SSE
3. **Parse latest log file** for `<internal>` tags
4. **Use log timestamps** for processing detection

**Pros:** No major NanoClaw changes needed
**Cons:** Less accurate, higher latency, more resource intensive

---

## Future Enhancements

1. **Tool Usage Tracking** - Show which tools agent is using
2. **Progress Percentage** - Estimate completion based on output length
3. **ETA Display** - Predict when response will be ready
4. **Replay Mode** - Show status timeline after completion
5. **Multi-Agent Coordination** - Track status across team of agents

---

## Dependencies

**NanoClaw:**
- `events` module (Node.js built-in)
- SSE streaming support

**Agentic:**
- Existing `useSSE` hook
- React hooks

**Infrastructure:**
- Network connectivity between NanoClaw and Agentic
- CORS configuration if different origins

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance overhead | Medium | Low | Emit events async, batch updates |
| SSE connection drops | High | Medium | Auto-reconnect with exponential backoff |
| Status desync | Low | Medium | Include timestamps, validate sequence |
| Container lifecycle issues | Medium | High | Robust error handling, timeouts |
| Scalability concerns | Low | Medium | Use Redis pub/sub for multi-instance |

---

## Estimated Effort

- **NanoClaw changes:** 2-3 days
- **Agentic integration:** 1-2 days
- **Testing:** 2-3 days
- **Documentation:** 1 day
- **Deployment:** 1 day

**Total:** ~2 weeks for 1 developer

---

## Open Questions

1. Should status persist in database or be ephemeral?
2. How to handle multi-instance NanoClaw deployments?
3. What happens if multiple users message same agent simultaneously?
4. Should we show queue position if agent is busy?
5. Do we need status history/logging?

---

*Last Updated: 2026-03-07*
*Status: Planning Phase*
*Owner: TBD*
