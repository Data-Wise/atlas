# Atlas MCP Server

Atlas exposes its project intelligence via [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), allowing Claude to query and control your workflow directly.

## Quick Setup

### Claude Desktop

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "atlas": {
      "command": "node",
      "args": ["/path/to/atlas/src/mcp/index.js"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "atlas": {
      "command": "atlas-mcp"
    }
  }
}
```

### Claude Code CLI

Atlas MCP is automatically available when running from the atlas project directory, or add to your global settings.

## Available Tools

### Read Tools

| Tool | Description |
|------|-------------|
| `atlas_get_context` | Current session, breadcrumbs, project status ("where am I?") |
| `atlas_get_projects` | List registered projects with status and type |
| `atlas_get_sessions` | Session statistics and history |
| `atlas_get_trail` | Breadcrumb trail for context reconstruction |
| `atlas_get_inbox` | Quick capture inbox items |
| `atlas_plan` | Morning planning summary |

### Write Tools

| Tool | Description |
|------|-------------|
| `atlas_start_session` | Start a new work session |
| `atlas_end_session` | End current session |
| `atlas_capture` | Quick capture idea/task/bug/note |
| `atlas_breadcrumb` | Log context breadcrumb |

## Tool Reference

### atlas_get_context

Get current context: active session, recent breadcrumbs, project status.

```javascript
// Parameters
{
  project?: string  // Optional: filter to specific project
}

// Returns
{
  activeSession: { project, task, duration, isFlowState },
  project: string,
  focus: string,
  recentCrumbs: [...],
  inboxCount: number
}
```

### atlas_get_projects

List registered projects.

```javascript
// Parameters
{
  status?: 'active' | 'paused' | 'completed' | 'archived',
  tag?: string,
  limit?: number  // Default: 20
}

// Returns
[
  { name, path, type, status },
  ...
]
```

### atlas_get_sessions

Get session statistics.

```javascript
// Parameters
{
  days?: number,              // Default: 7
  period?: 'today' | 'week' | 'month' | 'year',
  project?: string
}

// Returns
{
  summary: { totalSessions, totalMinutes, flowPercentage, completionRate },
  streak: { current, longest, display },
  bestDay: { dayName, minutes },
  estimation: { hasData, accuracyRate, message }
}
```

### atlas_get_trail

Get breadcrumb trail for context reconstruction.

```javascript
// Parameters
{
  project?: string,  // Optional: filter to specific project
  days?: number      // Days to look back (default: 7)
}

// Returns
[
  { text, type, project, timestamp },
  ...
]
```

### atlas_get_inbox

Get quick capture inbox items awaiting triage.

```javascript
// Parameters
{
  type?: 'idea' | 'task' | 'bug' | 'note',  // Filter by type
  project?: string,                           // Filter by project
  limit?: number                              // Max items (default: 20)
}

// Returns
[
  { text, type, project, tags, createdAt },
  ...
]
```

### atlas_plan

Get morning planning summary with suggestions.

```javascript
// Parameters
{
  scanEcosystem?: boolean  // Include .STATUS scan (default: false)
}

// Returns
{
  streak: { current, longest },
  yesterday: { sessions, totalMinutes },
  parked: [...],
  inbox: { count, items },
  suggestions: [...]
}
```

### atlas_start_session

Start a new work session.

```javascript
// Parameters
{
  project: string,            // Required
  task?: string,
  estimatedMinutes?: number,
  energyLevel?: 'high' | 'medium' | 'low'
}

// Returns
"Started session for 'atlas': Fix MCP integration"
```

### atlas_end_session

End current session.

```javascript
// Parameters
{
  note?: string,
  outcome?: 'completed' | 'cancelled' | 'interrupted'
}

// Returns
"Session ended. Duration: 45m"
```

### atlas_capture

Quick capture an idea, task, or note.

```javascript
// Parameters
{
  text: string,               // Required
  type?: 'idea' | 'task' | 'bug' | 'note',
  project?: string,
  tags?: string[]
}

// Returns
"Captured idea: 'Add caching layer' (atlas) [performance]"
```

### atlas_breadcrumb

Log a context breadcrumb.

```javascript
// Parameters
{
  text: string,               // Required
  type?: 'thought' | 'decision' | 'blocker' | 'next' | 'note',
  project?: string
}

// Returns
"Logged breadcrumb: 'Decided to use Redis for caching' (atlas)"
```

## Resources

The MCP server also exposes resources for real-time data:

| URI | Description |
|-----|-------------|
| `atlas://session/current` | Current session (JSON) |
| `atlas://context` | Full context (JSON) |

## Example Workflows

### Morning Check-in

```
Claude: Let me check your current workflow status.
[Uses atlas_plan]

Response:
=== Morning Planning ===

Streak: 5 days
Yesterday: 3 sessions, 2h 15m

Parked contexts:
  - flow-cli: switching to urgent bug fix

Inbox: 4 items to triage

Suggestions:
  - Continue your streak! Start a session on atlas.
  - You have parked work on flow-cli.
```

### Context Restoration

```
Claude: Where did you leave off with the atlas project?
[Uses atlas_get_context with project='atlas']

Response:
=== Current Context ===

No active session

Project: atlas
  Focus: MCP server implementation

Recent breadcrumbs:
  - Finished read tools, starting write tools (10 min ago)
  - Decided to use single file for simplicity (25 min ago)
  - Looking at statistical-research MCP as reference (1 hour ago)

Inbox: 2 items awaiting triage
```

### Session Tracking

```
Claude: Start a session on atlas for MCP testing
[Uses atlas_start_session with project='atlas', task='MCP testing', estimatedMinutes=30]

Response:
Started session for "atlas": MCP testing
Estimated: 30 minutes
Started at: 2:30 PM

[Later...]

Claude: End the session, I got the tests passing
[Uses atlas_end_session with note='All 16 MCP tests passing']

Response:
Session ended. Duration: 28m
Note: All 16 MCP tests passing
```

## Troubleshooting

### Server won't start

1. Check Node.js version (requires >=18)
2. Verify atlas is installed: `npm list @data-wise/atlas`
3. Check MCP SDK: `npm list @modelcontextprotocol/sdk`

### Tools not appearing

1. Restart Claude Desktop after config changes
2. Check settings.json syntax is valid JSON
3. Verify path to atlas-mcp is correct

### Error: "No active session"

Some operations require an active session. Start one with `atlas_start_session` first.

## Development

Run the MCP server directly for testing:

```bash
# From atlas directory
node src/mcp/index.js

# Logs to stderr, MCP protocol on stdio
```

Run tests:

```bash
npm test -- --testPathPattern=mcp
```
