# Agentic - Mission Control Dashboard

A modern, beautiful dashboard for managing and interacting with AI agents. Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🎯 **Mission Control View**: Grid layout showing all active agents at a glance
- 💬 **Real-time Chat**: Click any agent to view conversation history and interact
- 📊 **Agent Status**: Visual indicators for agent states (active, idle, error, offline)
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- 📱 **Responsive**: Works seamlessly on desktop, tablet, and mobile

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build

```bash
npm run build
npm start
```

## Architecture

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **date-fns** - Date formatting utilities

## Project Structure

```
agentic/
├── app/
│   └── page.tsx              # Main dashboard page
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── agent-grid.tsx        # Grid layout for agents
│   ├── agent-card.tsx        # Individual agent card
│   └── agent-dialog.tsx      # Agent conversation modal
├── types/
│   └── agent.ts              # TypeScript type definitions
└── lib/
    └── utils.ts              # Utility functions
```

## Usage

The dashboard displays a grid of agent cards, each showing:
- Agent name and type
- Current status (active/idle/error/offline)
- Last activity time
- Current task (if any)
- Message count

Click any agent card to open a conversation dialog where you can:
- View message history
- Send new messages
- See real-time status updates

## Customization

### Adding Real Agents

Replace the mock data in `app/page.tsx` with your actual agent connections:

```typescript
// Replace mockAgents with real agent data from your backend
const agents = await fetchAgents();

// Replace mockMessages with real message history
const messages = await fetchMessages(agentId);
```

### Styling

Customize the theme by editing `app/globals.css` or modifying Tailwind config.

## License

MIT
