#!/usr/bin/env node
/**
 * Atlas MCP Server
 *
 * Exposes Atlas project intelligence to Claude via MCP.
 *
 * Tools:
 * - atlas_get_context: Current session, breadcrumbs, project status
 * - atlas_get_projects: List registered projects
 * - atlas_get_sessions: Session history and statistics
 * - atlas_start_session: Start a new work session
 * - atlas_end_session: End current session
 * - atlas_capture: Quick capture idea/task/note
 * - atlas_breadcrumb: Log context breadcrumb
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js'

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const pkg = require('../../package.json')

import Atlas from '../index.js'
import { BusinessRules } from '../domain/constants/BusinessRules.js'
import {
  formatContext,
  formatProjects,
  formatStats,
  formatTrail,
  formatInbox,
  formatPlan,
  formatSessionStart,
  formatSessionEnd,
  formatCapture,
  formatBreadcrumb
} from './formatters.js'

// Initialize Atlas instance
const atlas = new Atlas({
  dataDir: process.env.ATLAS_DATA_DIR,
  storage: process.env.ATLAS_STORAGE || 'filesystem'
})

// Tool definitions
const TOOLS = [
  // === Read Tools ===
  {
    name: 'atlas_get_context',
    description: 'Get current context: active session, recent breadcrumbs, project status, and inbox count. Use this to understand "where am I?" in the workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Optional: filter context to specific project'
        }
      }
    }
  },
  {
    name: 'atlas_get_projects',
    description: 'List registered projects with their status, type, and recent activity. Can filter by status or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'paused', 'completed', 'archived'],
          description: 'Filter by project status'
        },
        tag: {
          type: 'string',
          description: 'Filter by tag'
        },
        kind: {
          type: 'string',
          enum: ['manuscript', 'program', 'package'],
          description: 'Filter by kind (research registry)'
        },
        limit: {
          type: 'number',
          description: 'Maximum projects to return (default: 20)',
          default: 20
        }
      }
    }
  },
  {
    name: 'atlas_get_sessions',
    description: 'Get session statistics and history. Shows total time, flow state percentage, streaks, and project breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze (default: 7)',
          default: 7
        },
        period: {
          type: 'string',
          enum: ['today', 'week', 'month', 'year'],
          description: 'Period shorthand (alternative to days)'
        },
        project: {
          type: 'string',
          description: 'Filter stats to specific project'
        }
      }
    }
  },
  {
    name: 'atlas_get_trail',
    description: 'Get breadcrumb trail for context reconstruction. Shows recent thoughts, decisions, and "where was I?" hints.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Optional: filter trail to specific project'
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 7)',
          default: 7
        }
      }
    }
  },
  {
    name: 'atlas_get_inbox',
    description: 'Get quick capture inbox items. Shows ideas, tasks, bugs, and notes awaiting triage.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['idea', 'task', 'bug', 'note'],
          description: 'Filter by capture type'
        },
        project: {
          type: 'string',
          description: 'Filter by project'
        },
        limit: {
          type: 'number',
          description: 'Maximum items to return (default: 20)',
          default: 20
        }
      }
    }
  },

  // === Write Tools ===
  {
    name: 'atlas_start_session',
    description: 'Start a new work session. Tracks time, enables flow state detection, and connects to project context.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project name (required)'
        },
        task: {
          type: 'string',
          description: 'Task description (what you\'re working on)'
        },
        estimatedMinutes: {
          type: 'number',
          description: 'Estimated duration in minutes (helps calibrate time perception)'
        },
        energyLevel: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Current energy level for task matching'
        }
      },
      required: ['project']
    }
  },
  {
    name: 'atlas_end_session',
    description: 'End the current work session. Records duration, triggers celebration, and saves context.',
    inputSchema: {
      type: 'object',
      properties: {
        note: {
          type: 'string',
          description: 'Session completion note (what was accomplished)'
        },
        outcome: {
          type: 'string',
          enum: ['completed', 'cancelled', 'interrupted'],
          description: 'Session outcome (default: completed)',
          default: 'completed'
        }
      }
    }
  },
  {
    name: 'atlas_capture',
    description: 'Quick capture an idea, task, bug, or note. Zero-friction brain dump that goes to inbox for later triage.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The thought/idea/task to capture (required)'
        },
        type: {
          type: 'string',
          enum: ['idea', 'task', 'bug', 'note'],
          description: 'Capture type (default: idea)',
          default: 'idea'
        },
        project: {
          type: 'string',
          description: 'Associate with specific project'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for organization'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'atlas_breadcrumb',
    description: 'Log a breadcrumb for context trail. Use for thoughts, decisions, blockers, and "where I left off" notes.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The breadcrumb text (required)'
        },
        type: {
          type: 'string',
          enum: ['thought', 'decision', 'blocker', 'next', 'note'],
          description: 'Breadcrumb type (default: thought)',
          default: 'thought'
        },
        project: {
          type: 'string',
          description: 'Associate with specific project'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'atlas_plan',
    description: 'Get morning planning summary. Shows yesterday\'s work, parked contexts, inbox items, and suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        scanEcosystem: {
          type: 'boolean',
          description: 'Include .STATUS file scan for ecosystem overview',
          default: false
        }
      }
    }
  }
]

// Create server instance
const server = new Server(
  {
    name: 'atlas',
    version: pkg.version
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
)

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS }
})

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'atlas://session/current',
        name: 'Current Session',
        description: 'Real-time view of the active work session',
        mimeType: 'application/json'
      },
      {
        uri: 'atlas://context',
        name: 'Current Context',
        description: 'Full context including session, breadcrumbs, and project status',
        mimeType: 'application/json'
      }
    ]
  }
})

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  if (uri === 'atlas://session/current') {
    const session = await atlas.sessions.current()
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(session ? {
            id: session.id,
            project: session.project,
            task: session.task,
            startTime: session.startTime,
            duration: session.getDuration ? session.getDuration() : null,
            state: session.state?.value || session.state,
            isFlowState: session.isFlowState?.() || false,
            energyLevel: session.energyLevel,
            estimatedMinutes: session.estimatedMinutes
          } : null, null, 2)
        }
      ]
    }
  }

  if (uri === 'atlas://context') {
    const context = await atlas.context.where()
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(context, null, 2)
        }
      ]
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      // === Read Tools ===
      case 'atlas_get_context': {
        const context = await atlas.context.where(args?.project)
        return {
          content: [{
            type: 'text',
            text: formatContext(context)
          }]
        }
      }

      case 'atlas_get_projects': {
        const projects = await atlas.projects.list({
          status: args?.status,
          tag: args?.tag,
          kind: args?.kind
        })
        const limited = projects.slice(0, args?.limit || 20)
        return {
          content: [{
            type: 'text',
            text: formatProjects(limited)
          }]
        }
      }

      case 'atlas_get_sessions': {
        const stats = await atlas.sessions.stats({
          days: args?.days,
          period: args?.period,
          project: args?.project
        })
        return {
          content: [{
            type: 'text',
            text: formatStats(stats)
          }]
        }
      }

      case 'atlas_get_trail': {
        const trail = await atlas.context.trail(args?.project, args?.days || 7)
        return {
          content: [{
            type: 'text',
            text: formatTrail(trail)
          }]
        }
      }

      case 'atlas_get_inbox': {
        const inbox = await atlas.capture.inbox({
          type: args?.type,
          project: args?.project,
          limit: args?.limit || 20
        })
        return {
          content: [{
            type: 'text',
            text: formatInbox(inbox)
          }]
        }
      }

      // === Write Tools ===
      case 'atlas_start_session': {
        if (!args?.project) {
          throw new Error('Project name is required')
        }
        const session = await atlas.sessions.start(args.project, {
          task: args.task,
          estimatedMinutes: args.estimatedMinutes,
          energyLevel: args.energyLevel
        })
        return {
          content: [{
            type: 'text',
            text: formatSessionStart(session)
          }]
        }
      }

      case 'atlas_end_session': {
        const result = await atlas.sessions.end(args?.note)
        return {
          content: [{
            type: 'text',
            text: formatSessionEnd(result, args?.note)
          }]
        }
      }

      case 'atlas_capture': {
        if (!args?.text) {
          throw new Error('Capture text is required')
        }
        if (args.text.length > BusinessRules.CAPTURE_TEXT_MAX_LENGTH) {
          throw new Error(`Capture text exceeds maximum length of ${BusinessRules.CAPTURE_TEXT_MAX_LENGTH} characters`)
        }
        await atlas.capture.add(args.text, {
          type: args.type || 'idea',
          project: args.project,
          tags: args.tags || []
        })
        return {
          content: [{
            type: 'text',
            text: formatCapture(args.text, args.type, args.project, args.tags)
          }]
        }
      }

      case 'atlas_breadcrumb': {
        if (!args?.text) {
          throw new Error('Breadcrumb text is required')
        }
        if (args.text.length > BusinessRules.BREADCRUMB_TEXT_MAX_LENGTH) {
          throw new Error(`Breadcrumb text exceeds maximum length of ${BusinessRules.BREADCRUMB_TEXT_MAX_LENGTH} characters`)
        }
        await atlas.context.breadcrumb(args.text, args.project)
        return {
          content: [{
            type: 'text',
            text: formatBreadcrumb(args.text, args.project)
          }]
        }
      }

      case 'atlas_plan': {
        const plan = await atlas.sessions.plan({
          scanEcosystem: args?.scanEcosystem
        })
        return {
          content: [{
            type: 'text',
            text: formatPlan(plan)
          }]
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true
    }
  }
})

// Cleanup on exit
process.on('SIGINT', () => {
  atlas.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  atlas.close()
  process.exit(0)
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`Atlas MCP Server v${pkg.version} running on stdio`)
  console.error('Tools: atlas_get_context, atlas_get_projects, atlas_get_sessions, atlas_get_trail, atlas_get_inbox, atlas_start_session, atlas_end_session, atlas_capture, atlas_breadcrumb, atlas_plan')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
