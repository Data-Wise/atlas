/**
 * StatusController
 *
 * CLI controller for the enhanced status command.
 * Uses GetStatusUseCase to retrieve comprehensive workflow status.
 *
 * Features:
 * - Active session display with color-coded output
 * - Today's session summary
 * - Recent session history
 * - Project statistics
 * - Productivity metrics
 * - Worklog integration
 * - Box drawing characters for visual structure
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'fs/promises'
import { existsSync } from 'node:fs'
import chalk from 'chalk'
import { WebDashboard } from '../../web/WebDashboard.js'
import open from 'open'
import { sparkline, progressBar, durationBar } from '../../utils/ascii-charts.js'

export class StatusController {
  /**
   * @param {GetStatusUseCase} getStatusUseCase
   * @param {Object} options
   * @param {SimpleEventPublisher} [options.eventPublisher] - Event publisher for web dashboard
   */
  constructor(getStatusUseCase, options = {}) {
    this.getStatus = getStatusUseCase
    this.eventPublisher = options.eventPublisher
  }

  /**
   * Handle status command
   * @param {Object} options
   * @param {boolean} options.verbose - Show detailed output
   * @param {boolean} options.includeWorklog - Include worklog entries
   * @param {number} options.recentDays - Days to include in recent history
   * @param {boolean} options.web - Launch web dashboard
   * @param {number} options.port - Web dashboard port (default: 3737)
   */
  async handle(options = {}) {
    // Web dashboard mode
    if (options.web) {
      return await this.launchWebDashboard(options.port)
    }

    // Default CLI mode
    const verbose = options.verbose || false
    const includeWorklog = options.includeWorklog !== false
    const recentDays = options.recentDays || 7

    try {
      // Get status from use case
      const status = await this.getStatus.execute({ recentDays })

      // Display active session
      if (status.activeSession) {
        this.displayActiveSession(status.activeSession, verbose)
      } else {
        this.displayNoActiveSession()
      }

      // Display today summary
      if (status.today) {
        console.log('')
        this.displayTodaySummary(status.today, verbose)
      }

      // Display productivity metrics
      if (status.metrics && verbose) {
        console.log('')
        this.displayProductivityMetrics(status.metrics)
      }

      // Display recent sessions
      if (status.recent && status.recent.sessions > 0) {
        console.log('')
        this.displayRecentSessions(status.recent, verbose)
      }

      // Display project stats
      if (status.projects && verbose) {
        console.log('')
        this.displayProjectStats(status.projects)
      }

      // Display worklog entries
      if (includeWorklog) {
        const worklog = await this.readWorklog()
        if (worklog.length > 0) {
          console.log('')
          this.displayWorklog(worklog.slice(0, 5))
        }
      }

      // Display quick actions
      if (status.activeSession) {
        console.log('')
        this.displayQuickActions()
      }

      return { success: true, status }
    } catch (error) {
      console.error(`status: error retrieving status: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Display active session information
   */
  displayActiveSession(session, verbose) {
    // Box drawing with color
    console.log(chalk.green('╭─────────────────────────────────────────────────────────╮'))
    console.log(
      chalk.green('│') +
        chalk.green.bold(' ✅ ACTIVE SESSION                                       ') +
        chalk.green('│')
    )
    console.log(chalk.green('├─────────────────────────────────────────────────────────┤'))

    // Project and task
    const projectLine =
      `│ Project: ${chalk.cyan(session.project)}`.padEnd(72 - session.project.length, ' ') + '│'
    console.log(projectLine)

    const taskText = session.task || 'No task specified'
    const taskLine = `│ Task: ${chalk.yellow(taskText)}`.padEnd(72 - taskText.length, ' ') + '│'
    console.log(taskLine)

    // Duration with flow state
    const flowIndicator = session.isFlowState ? chalk.red.bold(' 🔥 IN FLOW') : ''
    const durationText = `${session.duration} min${flowIndicator}`
    console.log(`│ Duration: ${durationText}`.padEnd(66, ' ') + '│')

    if (verbose) {
      console.log(chalk.green('├─────────────────────────────────────────────────────────┤'))
      console.log(`│ Branch: ${chalk.magenta(session.branch || 'unknown')}`.padEnd(66, ' ') + '│')
      console.log(
        `│ Started: ${chalk.white(this.formatTime(session.startTime))}`.padEnd(66, ' ') + '│'
      )

      // Git status if available
      if (session.gitStatus) {
        const { dirty, uncommittedFiles, ahead, behind } = session.gitStatus

        if (dirty || ahead > 0 || behind > 0) {
          console.log(chalk.green('├─────────────────────────────────────────────────────────┤'))
          console.log(
            chalk.green('│') +
              chalk.yellow.bold(' 📎 Git Status                                           ') +
              chalk.green('│')
          )

          if (uncommittedFiles.length > 0) {
            const filesText = `${uncommittedFiles.length} uncommitted file${uncommittedFiles.length > 1 ? 's' : ''}`
            console.log(`│   ${chalk.yellow(filesText)}`.padEnd(66, ' ') + '│')
          }

          if (ahead > 0) {
            console.log(
              `│   ${chalk.green(`↑ ${ahead} commit${ahead > 1 ? 's' : ''} ahead`)}`.padEnd(
                66,
                ' '
              ) + '│'
            )
          }

          if (behind > 0) {
            console.log(
              `│   ${chalk.red(`↓ ${behind} commit${behind > 1 ? 's' : ''} behind`)}`.padEnd(
                66,
                ' '
              ) + '│'
            )
          }
        }
      }

      // Next action from .STATUS file
      if (session.statusFile && session.statusFile.next && session.statusFile.next.length > 0) {
        console.log(chalk.green('├─────────────────────────────────────────────────────────┤'))
        console.log(
          chalk.green('│') +
            chalk.magenta.bold(' 📌 Next Action                                          ') +
            chalk.green('│')
        )

        const nextAction = session.statusFile.next[0]
        const actionText = nextAction.action
        const maxLength = 56 // Box width minus padding

        // Wrap long action text
        if (actionText.length <= maxLength) {
          console.log(`│   ${chalk.white(actionText)}`.padEnd(66, ' ') + '│')
        } else {
          // Simple wrapping for long text
          let remaining = actionText
          while (remaining.length > 0) {
            const chunk = remaining.substring(0, maxLength)
            console.log(`│   ${chalk.white(chunk)}`.padEnd(66, ' ') + '│')
            remaining = remaining.substring(maxLength)
          }
        }

        // Show estimate and priority if available
        if (nextAction.estimate || nextAction.priority) {
          const details = []
          if (nextAction.estimate) details.push(chalk.gray(`est: ${nextAction.estimate}`))
          if (nextAction.priority) {
            const priorityColor =
              nextAction.priority === 'high'
                ? chalk.red
                : nextAction.priority === 'medium'
                  ? chalk.yellow
                  : chalk.gray
            details.push(priorityColor(`priority: ${nextAction.priority}`))
          }
          console.log(`│   ${details.join(' • ')}`.padEnd(66, ' ') + '│')
        }
      }

      if (session.context && Object.keys(session.context).length > 0) {
        console.log(chalk.green('├─────────────────────────────────────────────────────────┤'))
        console.log(
          chalk.green('│') +
            chalk.blue.bold(' 📝 Context                                              ') +
            chalk.green('│')
        )
        for (const [key, value] of Object.entries(session.context)) {
          const contextLine = `│   ${chalk.gray(key)}: ${value}`.padEnd(66, ' ') + '│'
          console.log(contextLine)
        }
      }
    }

    console.log(chalk.green('╰─────────────────────────────────────────────────────────╯'))
  }

  /**
   * Display no active session message
   */
  displayNoActiveSession() {
    console.log(chalk.red('❌ No active session'))
    console.log(chalk.gray('\n💡 Start a session with:'))
    console.log(chalk.cyan('   flow work <project> [task]'))
  }

  /**
   * Display today's summary
   */
  displayTodaySummary(today, verbose) {
    console.log(chalk.blue.bold('📊 Today'))
    console.log(`   Sessions: ${chalk.white(today.sessions)}`)

    // Duration with visual bar
    const durationText = durationBar(today.totalDuration)
    console.log(`   Duration: ${chalk.white(durationText)}`)

    // Completion rate with progress bar
    const completionRate = today.sessions > 0 ? (today.completedSessions / today.sessions) * 100 : 0
    const completionBar = progressBar(completionRate, 100, { width: 10 })
    console.log(
      `   Completed: ${chalk.green(today.completedSessions)}/${today.sessions} ${chalk.gray(completionBar)}`
    )

    if (verbose && today.flowSessions !== undefined) {
      console.log(`   Flow sessions: ${chalk.red(today.flowSessions)}`)
    }
  }

  /**
   * Display productivity metrics
   */
  displayProductivityMetrics(metrics) {
    console.log(chalk.magenta.bold('📈 Productivity Metrics'))

    // Flow percentage with progress bar
    const flowBar = progressBar(metrics.flowPercentage, 100, { width: 10 })
    console.log(`   Flow %: ${chalk.red(metrics.flowPercentage + '%')} ${chalk.gray(flowBar)}`)

    // Completion rate with progress bar
    const completionBar = progressBar(metrics.completionRate, 100, { width: 10 })
    console.log(
      `   Completion rate: ${chalk.green(metrics.completionRate + '%')} ${chalk.gray(completionBar)}`
    )

    console.log(`   Current streak: ${chalk.yellow(metrics.streak)} days`)

    const trendIcon = metrics.trend === 'up' ? '📈' : metrics.trend === 'down' ? '📉' : '➡️'
    const trendColor =
      metrics.trend === 'up' ? chalk.green : metrics.trend === 'down' ? chalk.red : chalk.gray
    console.log(`   Trend: ${trendIcon} ${trendColor(metrics.trend)}`)
  }

  /**
   * Display recent sessions
   */
  displayRecentSessions(recent, verbose) {
    console.log(chalk.cyan.bold(`📜 Recent Sessions (last ${recent.period} days)`))
    console.log(`   Total: ${chalk.white(recent.sessions)}`)
    console.log(`   Duration: ${chalk.white(this.formatDuration(recent.totalDuration))}`)
    console.log(`   Average: ${chalk.white(this.formatDuration(recent.averageDuration))}`)

    // Add sparkline for session duration trend if we have data
    if (recent.recentSessions && recent.recentSessions.length > 0) {
      const durations = recent.recentSessions
        .slice(0, 10)
        .reverse()
        .map(s => s.duration)
      const trend = sparkline(durations)
      console.log(`   Trend: ${chalk.gray(trend)}`)
    }

    if (verbose && recent.recentSessions) {
      console.log(chalk.gray('\n   Last 3 sessions:'))
      for (const session of recent.recentSessions.slice(0, 3)) {
        const icon =
          session.outcome === 'completed'
            ? chalk.green('✓')
            : session.outcome === 'cancelled'
              ? chalk.red('✗')
              : chalk.gray('?')
        console.log(
          `   ${icon} ${chalk.cyan(session.project)} (${session.duration}m) - ${chalk.gray(this.relativeTime(session.endTime))}`
        )
      }
    }
  }

  /**
   * Display project statistics
   */
  displayProjectStats(projects) {
    console.log(chalk.yellow.bold('📁 Projects'))
    console.log(`   Total: ${chalk.white(projects.total)}`)
    console.log(`   Recent: ${chalk.white(projects.recentCount || 0)}`)

    if (projects.topProjects && projects.topProjects.length > 0) {
      console.log(chalk.gray('\n   Top projects:'))
      for (const project of projects.topProjects.slice(0, 3)) {
        console.log(
          `   • ${chalk.cyan(project.name)} (${chalk.white(this.formatDuration(project.totalDuration))})`
        )
      }
    }
  }

  /**
   * Display worklog entries
   */
  displayWorklog(entries) {
    console.log(chalk.blue.bold('📝 Recent Worklog'))
    for (const entry of entries) {
      const time = entry.timestamp ? this.formatTime(entry.timestamp) : 'unknown'
      console.log(
        `   ${chalk.gray(time)} - ${chalk.yellow(entry.action)}: ${chalk.white(entry.details || '')}`
      )
    }
  }

  /**
   * Display quick actions menu
   */
  displayQuickActions() {
    console.log(chalk.green.bold('⚡ Quick Actions'))
    console.log(`   ${chalk.cyan('[f]')} flow finish     - ${chalk.gray('End session')}`)
    console.log(`   ${chalk.cyan('[p]')} flow pause      - ${chalk.gray('Pause session')}`)
    console.log(`   ${chalk.cyan('[s]')} flow switch     - ${chalk.gray('Switch project')}`)
    console.log(`   ${chalk.cyan('[t]')} flow task       - ${chalk.gray('Add task')}`)
  }

  /**
   * Read worklog entries
   */
  async readWorklog() {
    const worklogPath = join(homedir(), '.config', 'zsh', '.worklog')

    if (!existsSync(worklogPath)) {
      return []
    }

    try {
      const content = await readFile(worklogPath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      return lines
        .map(line => {
          const [timestamp, ...rest] = line.split(' ')
          const text = rest.join(' ')
          const [action, ...detailsParts] = text.split(':')

          return {
            timestamp: new Date(timestamp),
            action: action.trim(),
            details: detailsParts.join(':').trim()
          }
        })
        .reverse() // Most recent first
    } catch (error) {
      console.error(`Warning: Could not read worklog: ${error.message}`)
      return []
    }
  }

  /**
   * Format duration in minutes to human-readable string
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes}m`
    }

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (mins === 0) {
      return `${hours}h`
    }

    return `${hours}h ${mins}m`
  }

  /**
   * Format time
   */
  formatTime(date) {
    if (!(date instanceof Date)) {
      date = new Date(date)
    }

    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${hours}:${minutes}`
  }

  /**
   * Format relative time (e.g., "2h ago")
   */
  relativeTime(date) {
    if (!(date instanceof Date)) {
      date = new Date(date)
    }

    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    }

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  /**
   * Launch web dashboard
   * @param {number} port - Port to run dashboard on (default: 3737)
   */
  async launchWebDashboard(port = 3737) {
    try {
      if (!this.eventPublisher) {
        console.error(chalk.red('Error: Event publisher not configured'))
        console.log(chalk.gray('Web dashboard requires event publisher for real-time updates'))
        return { success: false, error: 'Event publisher not configured' }
      }

      console.log(chalk.blue.bold('🚀 Starting Web Dashboard...'))
      console.log('')

      const dashboard = new WebDashboard(this.getStatus, this.eventPublisher)
      const url = await dashboard.start(port)

      console.log(chalk.green('✅ Dashboard started successfully'))
      console.log('')
      console.log(chalk.cyan(`   URL: ${chalk.bold(url)}`))
      console.log(chalk.gray(`   Opening in browser...`))
      console.log('')

      // Open browser
      try {
        await open(url)
        console.log(chalk.green('✅ Browser opened'))
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not auto-open browser'))
        console.log(chalk.gray(`   Manually visit: ${url}`))
      }

      console.log('')
      console.log(chalk.yellow('📊 Dashboard is running'))
      console.log(chalk.gray('   Press Ctrl+C to stop server'))
      console.log('')

      // Keep process alive
      await new Promise(() => {})

      return { success: true, url }
    } catch (error) {
      console.error(chalk.red(`Error launching web dashboard: ${error.message}`))
      return { success: false, error: error.message }
    }
  }
}
