/**
 * Atlas - Project State Engine
 * 
 * Clean Architecture implementation for project registry,
 * session management, capture, and context reconstruction.
 * 
 * @module @data-wise/atlas
 */

import { Container } from './adapters/Container.js';
import { Config } from './utils/Config.js';
import { resolveConfigDir } from './utils/configPath.js';

// Re-export domain entities for library consumers
export { Project } from './domain/entities/Project.js';
export { Session } from './domain/entities/Session.js';
export { Task } from './domain/entities/Task.js';
export { Capture } from './domain/entities/Capture.js';
export { Breadcrumb } from './domain/entities/Breadcrumb.js';

// Re-export value objects
export { ProjectType } from './domain/value-objects/ProjectType.js';
export { SessionState } from './domain/value-objects/SessionState.js';

/**
 * Atlas - Main facade class
 * 
 * Provides unified access to all atlas functionality:
 * - projects: Project registry operations
 * - sessions: Work session management
 * - capture: Quick idea/task capture
 * - context: Context reconstruction ("where was I?")
 */
export class Atlas {
  /**
   * @param {Object} options
   * @param {string} [options.configPath] - Data directory path
   * @param {string} [options.storage='filesystem'] - Storage backend: 'filesystem' or 'sqlite'
   */
  constructor(options = {}) {
    this.configPath = options.configPath || this._defaultConfigPath();
    this.storage = options.storage || process.env.ATLAS_STORAGE || 'filesystem';

    // Config manager for user preferences
    this.config = new Config(this.configPath);

    this.container = new Container({
      dataDir: this.configPath,
      storage: this.storage
    });

    // Initialize subsystems
    this.projects = new ProjectsAPI(this.container, this.config);
    this.sessions = new SessionsAPI(this.container);
    this.capture = new CaptureAPI(this.container);
    this.context = new ContextAPI(this.container);
    this.tasks = new TasksAPI(this.container);
  }

  /**
   * Close resources (important for SQLite)
   */
  close() {
    this.container.close();
  }

  _defaultConfigPath() {
    return resolveConfigDir();
  }

  /**
   * Initialize atlas configuration
   */
  async init(options = {}) {
    const { mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');
    
    if (!existsSync(this.configPath)) {
      await mkdir(this.configPath, { recursive: true });
    }
    
    return { success: true, message: `Atlas initialized at ${this.configPath}` };
  }

  /**
   * Sync registry from .STATUS files
   *
   * @param {Object} options
   * @param {string[]} [options.paths] - Root paths to scan (defaults to ~/projects)
   * @param {boolean} [options.dryRun] - If true, show what would be synced without saving
   * @param {boolean} [options.removeOrphans] - Remove projects no longer on disk
   */
  async sync(options = {}) {
    const syncUseCase = this.container.resolve('SyncRegistryUseCase');
    const configPaths = await this.config.getScanPaths();
    const rootPaths = options.paths || configPaths;

    const result = await syncUseCase.execute({
      rootPaths,
      dryRun: options.dryRun || false,
      removeOrphans: options.removeOrphans || false
    });

    const totalChanged = result.discovered.length + result.updated.length;
    const prefix = options.dryRun ? '[DRY RUN] Would sync' : 'Synced';

    return {
      success: true,
      ...result,
      message: `${prefix} ${totalChanged} projects (${result.discovered.length} new, ${result.updated.length} updated, ${result.unchanged.length} unchanged)`
    };
  }

  // Output formatters for CLI
  formatOutput(data, format = 'table') {
    switch (format) {
      case 'json':
        // Use replacer to convert value objects to strings
        console.log(JSON.stringify(data, (key, value) => {
          if (value && typeof value === 'object' && value._value !== undefined) {
            return value._value; // Value object - return inner value
          }
          return value;
        }, 2));
        break;
      case 'names':
        if (Array.isArray(data)) {
          data.forEach(p => console.log(p.name || p));
        }
        break;
      case 'shell':
        // Shell-friendly format for scripting
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([k, v]) => {
            if (typeof v === 'object') {
              console.log(`${k}="${JSON.stringify(v)}"`);
            } else {
              console.log(`${k}="${v}"`);
            }
          });
        }
        break;
      default: // table
        if (Array.isArray(data) && data.length > 0) {
          // Convert value objects to strings for clean table display
          const cleanData = data.map(item => this._cleanForTable(item));
          console.table(cleanData);
        } else if (data) {
          console.log(data);
        }
    }
  }

  /**
   * Convert value objects to strings for table display
   * @private
   */
  _cleanForTable(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && typeof value.toString === 'function' && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
        // Value object with toString() - use the string representation
        clean[key] = value.toString();
      } else if (value instanceof Date) {
        clean[key] = value.toISOString();
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  formatStatus(status) {
    if (!status) {
      console.log('No status available');
      return;
    }

    // Handle global status format (from GetStatusUseCase)
    if (status.activeSession !== undefined || status.today || status.metrics) {
      console.log('\n📊 WORKFLOW STATUS');
      console.log('─'.repeat(40));

      // Active session
      if (status.activeSession) {
        const s = status.activeSession;
        console.log(`🎯 Active: ${s.project || 'unknown'}`);
        if (s.task) console.log(`   Task: ${s.task}`);
        console.log(`   Duration: ${s.duration} min`);
        if (s.isFlowState) console.log(`   🌊 In flow state!`);
      } else {
        console.log('💤 No active session');
      }

      // Today's summary
      if (status.today) {
        console.log(`\n📅 Today: ${status.today.sessions} sessions, ${status.today.totalDuration} min`);
      }

      // Metrics
      if (status.metrics) {
        const m = status.metrics;
        console.log(`📈 Streak: ${m.streak} days | Flow: ${m.flowPercentage}% | Completion: ${m.completionRate}%`);
      }

      // Projects summary
      if (status.projects) {
        console.log(`\n📁 ${status.projects.total} projects registered`);
      }
      return;
    }

    // Handle project-specific status format
    console.log(`📁 ${status.project || status.name}`);
    console.log(`   Status: ${status.status || 'unknown'}`);
    if (status.focus) console.log(`   Focus: ${status.focus}`);
    if (status.session) console.log(`   Session: ${status.session.duration}`);
  }

  formatContext(context) {
    if (!context) {
      console.log('No context available');
      return;
    }
    console.log('\n🎯 CURRENT CONTEXT');
    console.log('─'.repeat(40));
    if (context.project) console.log(`Project: ${context.project}`);
    if (context.focus) console.log(`Focus: ${context.focus}`);
    if (context.session) console.log(`Session: ${context.session.duration || 'active'}`);
    if (context.recentCrumbs?.length) {
      console.log('\nRecent breadcrumbs:');
      context.recentCrumbs.forEach(c => {
        console.log(`  🍞 ${c.text} (${c.ago || c.getAge?.() || ''})`);
      });
    }
    if (context.inboxCount > 0) {
      console.log(`\n📥 ${context.inboxCount} items in inbox`);
    }
  }

  formatInbox(items) {
    if (!items?.length) {
      console.log('📭 Inbox empty');
      return;
    }
    console.log(`\n📥 INBOX (${items.length} items)`);
    console.log('─'.repeat(40));
    items.forEach((item, i) => {
      const icon = item.type === 'task' ? '☐' : item.type === 'bug' ? '🐛' : '💡';
      const age = item.getAge?.() || item.age || '';
      console.log(`${i + 1}. ${icon} ${item.text} ${age ? `(${age})` : ''}`);
      if (item.project) console.log(`   └─ ${item.project}`);
    });
  }

  formatTrail(trail) {
    if (!trail?.length) {
      console.log('No breadcrumbs found');
      return;
    }
    console.log('\n🍞 BREADCRUMB TRAIL');
    console.log('─'.repeat(40));
    trail.forEach(crumb => {
      const icon = crumb.getIcon?.() || '🍞';
      const time = crumb.timestamp?.toLocaleString?.() || crumb.timestamp;
      console.log(`${time} │ ${icon} ${crumb.text}`);
      if (crumb.project) console.log(`             └─ ${crumb.project}`);
    });
  }

  formatTasks(tasks) {
    if (!tasks?.length) {
      console.log('☐ No tasks found');
      return;
    }
    console.log(`\n☐ TASKS (${tasks.length} tasks)`);
    console.log('─'.repeat(40));
    tasks.forEach((task, i) => {
      const checkbox = task.completed ? '☒' : '☐';
      const priorityStr = task.priority?.value || task.priority || 'medium';
      const dueStr = task.dueDate ? ` (Due: ${new Date(task.dueDate).toISOString().split('T')[0]})` : '';
      const projStr = task.projectId ? ` [${task.projectId}]` : '';
      console.log(`${i + 1}. ${checkbox} ${task.description}${projStr}${dueStr} (${priorityStr})`);
    });
  }

  async formatStats(options = {}) {
    const { formatStatsTable, formatStatsJson, formatStatsText, formatStatsMarkdown } = await import('./adapters/presenters/StatsPresenter.js');
    const stats = await this.sessions.stats(options);

    switch (options.format) {
      case 'json':
        return formatStatsJson(stats);
      case 'text':
        return formatStatsText(stats);
      case 'md':
      case 'markdown':
        return formatStatsMarkdown(stats);
      default:
        return formatStatsTable(stats);
    }
  }

  async formatPlan(options = {}) {
    const plan = await this.sessions.plan(options);
    return this._renderPlan(plan);
  }

  _renderPlan(plan) {
    const lines = [];

    // Greeting and streak
    lines.push(`\n${plan.greeting}`);
    if (plan.streak?.current > 0) {
      lines.push(`${plan.streak.display}  ${plan.streak.message}`);
    }
    lines.push('');

    // Yesterday summary
    lines.push('─'.repeat(50));
    lines.push('📅 YESTERDAY');
    lines.push('─'.repeat(50));
    if (plan.yesterday?.hasSessions) {
      const y = plan.yesterday;
      lines.push(`   ${y.sessionCount} session${y.sessionCount > 1 ? 's' : ''} • ${y.hours}h ${y.minutes}m • ${y.completionRate}% completed`);
      if (y.projects.length > 0) {
        lines.push(`   Projects: ${y.projects.join(', ')}`);
      }
      if (y.lastTask) {
        lines.push(`   Last: ${y.lastTask}`);
      }
    } else {
      lines.push('   No sessions yesterday');
    }
    lines.push('');

    // Parked contexts
    if (plan.parkedContexts.length > 0) {
      lines.push('─'.repeat(50));
      lines.push('🅿️  PARKED CONTEXTS');
      lines.push('─'.repeat(50));
      for (const ctx of plan.parkedContexts) {
        lines.push(`   • ${ctx.project || 'No project'}: ${ctx.text?.substring(0, 50) || 'Context saved'}`);
      }
      lines.push('');
    }

    // Inbox
    if (plan.inbox.length > 0) {
      lines.push('─'.repeat(50));
      lines.push(`📥 INBOX (${plan.inbox.length} items)`);
      lines.push('─'.repeat(50));
      for (const item of plan.inbox.slice(0, 5)) {
        const icon = { idea: '💡', task: '✓', bug: '🐛', note: '📝' }[item.type] || '•';
        lines.push(`   ${icon} ${item.text?.substring(0, 50)}${item.text?.length > 50 ? '...' : ''}`);
      }
      if (plan.inbox.length > 5) {
        lines.push(`   ... and ${plan.inbox.length - 5} more`);
      }
      lines.push('');
    }

    // Active projects
    if (plan.activeProjects.length > 0) {
      lines.push('─'.repeat(50));
      lines.push('🎯 ACTIVE PROJECTS');
      lines.push('─'.repeat(50));
      for (const proj of plan.activeProjects.slice(0, 5)) {
        const priority = proj.priority === 1 ? '🔴' : proj.priority === 2 ? '🟡' : '⚪';
        const progress = proj.progress ? ` (${proj.progress}%)` : '';
        lines.push(`   ${priority} ${proj.name}${progress}`);
        if (proj.focus) {
          lines.push(`      └─ ${proj.focus.substring(0, 45)}${proj.focus.length > 45 ? '...' : ''}`);
        }
      }
      lines.push('');
    }

    // Ecosystem (if scanned)
    if (plan.ecosystem) {
      lines.push('─'.repeat(50));
      lines.push(`🌐 ECOSYSTEM (${plan.ecosystem.total} projects scanned)`);
      lines.push('─'.repeat(50));

      if (plan.ecosystem.highPriority?.length > 0) {
        lines.push('   P1 Focus:');
        for (const p of plan.ecosystem.highPriority.slice(0, 3)) {
          const progress = p.progress ? ` (${p.progress}%)` : '';
          lines.push(`   🔴 ${p.name}${progress}`);
        }
      }

      if (plan.ecosystem.inProgress?.length > 0) {
        lines.push('   In Progress:');
        for (const p of plan.ecosystem.inProgress.slice(0, 3)) {
          lines.push(`   🔄 ${p.name} (${p.progress}%)`);
        }
      }
      lines.push('');
    }

    // Suggestions
    if (plan.suggestions.length > 0) {
      lines.push('─'.repeat(50));
      lines.push('💡 SUGGESTIONS');
      lines.push('─'.repeat(50));
      for (const sug of plan.suggestions.slice(0, 3)) {
        lines.push(`   → ${sug.message}`);
        if (sug.action) {
          lines.push(`     ${sug.action}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Projects API - Registry operations
 */
class ProjectsAPI {
  constructor(container, config) {
    this.container = container;
    this.config = config;
  }

  async register(path, options = {}) {
    const registerUseCase = this.container.resolve('RegisterProjectUseCase');
    const result = await registerUseCase.execute({
      path,
      name: options.name,
      tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
      status: options.status,
      description: options.description
    });
    return result;
  }

  async doctor(options = {}) {
    const { DoctorUseCase } = await import('./use-cases/registry/DoctorUseCase.js');
    const projectRepository = this.container.resolve('ProjectRepository');
    const statusFileParser = this.container.resolve('StatusFileParser');
    const uc = new DoctorUseCase({ projectRepository, statusFileParser });
    return uc.execute(options);
  }

  async doctorFix(options = {}) {
    const { DoctorUseCase } = await import('./use-cases/registry/DoctorUseCase.js');
    const projectRepository = this.container.resolve('ProjectRepository');
    const uc = new DoctorUseCase({ projectRepository });
    return uc.fix(options);
  }

  async unregister(name) {
    const projectRepo = this.container.resolve('ProjectRepository');
    const all = await projectRepo.findAll();
    const matches = all.filter(p => p.name.toLowerCase() === name.toLowerCase());

    let targetId;
    if (matches.length > 1) {
      const list = matches.map(p => `  - ${p.name} (${p.path}) [ID: ${p.id}]`).join('\n');
      throw new Error(`Ambiguous project name "${name}". Multiple matches found:\n${list}\n\nPlease specify by ID instead.`);
    } else if (matches.length === 1) {
      targetId = matches[0].id;
    } else {
      targetId = name;
    }

    const deleted = await projectRepo.delete(targetId);
    return {
      success: deleted,
      message: deleted ? `Unregistered: ${name}` : `Project not found: ${name}`
    };
  }

  async list(options = {}) {
    const scanUseCase = this.container.resolve('ScanProjectsUseCase');
    const configPaths = await this.config.getScanPaths();
    const rootPath = options.rootPath || configPaths[0];
    const result = await scanUseCase.execute({ rootPath });

    // Combine discovered and updated for the full list
    const allProjects = [...(result.discovered || []), ...(result.updated || [])];

    let filtered = allProjects;
    if (options.status) {
      // Resolve status the same way the output mapping does — scanned projects
      // carry status in metadata, so filtering on p.status alone matched nothing.
      filtered = filtered.filter(p => (p.status || p.metadata?.status) === options.status);
    }
    if (options.tag) {
      filtered = filtered.filter(p => p.tags?.includes(options.tag));
    }
    if (options.kind) {
      // Research-registry: filter by kind (manuscript|program|package). Scanned
      // projects carry kind in metadata, like status above.
      filtered = filtered.filter(p => (p.kind || p.metadata?.kind) === options.kind);
    }

    return filtered.map(p => ({
      name: p.name,
      path: p.path,
      status: p.status || p.metadata?.status,
      type: p.type,
      kind: p.kind || p.metadata?.kind || null,
      target: p.target || p.metadata?.target || null,
      cranState: p.metadata?.cranState || null,
      taskCount: p.metadata?.tasks?.length || 0,
      progress: p.progress ?? p.metadata?.progress ?? null,
      next: p.next || p.metadata?.next || null,
      priority: p.metadata?.priorityLabel || p.priority || p.metadata?.priority || null
    }));
  }

  /**
   * Suggest a single project to work on: the most-recently-touched active project.
   * Ranks recent projects (GetRecentProjectsUseCase) and intersects with the active
   * set, falling back to the first active project, then null.
   * @returns {Promise<string|null>} project name, or null when none qualify
   */
  async suggest() {
    const useCase = this.container.resolve('GetRecentProjectsUseCase');
    const { projects } = await useCase.execute({ limit: 10, includeStats: false });
    const active = await this.list({ status: 'active' });
    const activeNames = new Set(active.map(p => p.name));
    const ranked = projects.find(p => activeNames.has(p.name));
    return ranked?.name || active[0]?.name || null;
  }

  async get(name) {
    const statusUseCase = this.container.resolve('GetStatusUseCase');
    return await statusUseCase.execute(name);
  }

  async setFocus(name, focus) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.execute({
      project: name,
      updates: { focus }
    });
  }

  async getFocus(name) {
    const project = await this.get(name);
    return project?.focus;
  }

  async setStatus(name, status) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.execute({
      project: name,
      updates: { status }
    });
  }

  async setProgress(name, progress) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.execute({
      project: name,
      updates: { progress }
    });
  }

  async update(name, updates) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.execute({
      project: name,
      updates,
      createIfMissing: updates.createIfMissing
    });
  }

  async incrementProgress(name, amount = 10) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.incrementProgress(name, amount);
  }

  async completeNextAction(name, newAction = null, evidence = null) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.completeNextAction(name, newAction, evidence);
  }
}

/**
 * Sessions API - Work session management
 */
class SessionsAPI {
  constructor(container) {
    this.container = container;
  }

  async start(project, options = {}) {
    const createSession = this.container.resolve('CreateSessionUseCase');
    const session = await createSession.execute({
      project: project || 'default',
      task: options.task,
      energyLevel: options.energyLevel,
      estimatedMinutes: options.estimatedMinutes
    });
    return {
      project: session.project,
      task: session.task,
      focus: session.focus,
      startTime: session.startTime,
      energyLevel: session.energyLevel,
      estimatedMinutes: session.estimatedMinutes
    };
  }

  async end(note, options = {}) {
    const endSession = this.container.resolve('EndSessionUseCase');
    const result = await endSession.execute({ note, outcome: options.outcome });
    const session = result.session || result; // tolerate use cases still returning a bare session
    return {
      duration: session.getDuration ? `${session.getDuration()}m` : 'unknown',
      note,
      gitDelta: result.gitDelta || null,
      synced: result.synced || false
    };
  }

  async current() {
    const sessionRepo = this.container.resolve('SessionRepository');
    return await sessionRepo.findActive();
  }

  async stats(options = {}) {
    const statsUseCase = this.container.resolve('GetSessionStatsUseCase');
    return await statsUseCase.execute(options);
  }

  async plan(options = {}) {
    const planUseCase = this.container.resolve('PlanDayUseCase');
    return await planUseCase.execute(options);
  }
}

/**
 * Capture API - Quick capture for ideas/tasks
 */
class CaptureAPI {
  constructor(container) {
    this.container = container;
  }

  async add(text, options = {}) {
    const captureUseCase = this.container.resolve('CaptureIdeaUseCase');
    return await captureUseCase.execute({
      text,
      type: options.type || 'idea',
      project: options.project,
      tags: options.tags || []
    });
  }

  async inbox(options = {}) {
    const inboxUseCase = this.container.resolve('GetInboxUseCase');
    return await inboxUseCase.execute(options);
  }

  async counts() {
    const captureRepo = this.container.resolve('CaptureRepository');
    return await captureRepo.getCounts();
  }
}

/**
 * Context API - Context reconstruction
 */
class ContextAPI {
  constructor(container) {
    this.container = container;
  }

  async where(project) {
    const contextUseCase = this.container.resolve('GetContextUseCase');
    return await contextUseCase.execute({ project });
  }

  async breadcrumb(text, project) {
    const logCrumbUseCase = this.container.resolve('LogBreadcrumbUseCase');
    return await logCrumbUseCase.execute({ text, project });
  }

  async trail(project, days = 7, limit) {
    const trailUseCase = this.container.resolve('GetTrailUseCase');
    return await trailUseCase.execute({ project, days, limit });
  }

  async getStatus(project) {
    const statusUseCase = this.container.resolve('GetStatusUseCase');
    return await statusUseCase.execute(project);
  }
}

/**
 * Tasks API - Task management and agenda scheduling
 */
class TasksAPI {
  constructor(container) {
    this.container = container;
  }

  async add(description, options = {}) {
    const addTaskUseCase = this.container.resolve('AddTaskUseCase');
    return await addTaskUseCase.execute({ description, options });
  }

  async list(filters = {}) {
    const listTasksUseCase = this.container.resolve('ListTasksUseCase');
    return await listTasksUseCase.execute(filters);
  }

  async complete(taskId) {
    const completeTaskUseCase = this.container.resolve('CompleteTaskUseCase');
    return await completeTaskUseCase.execute({ taskId });
  }

  async remove(taskId) {
    const removeTaskUseCase = this.container.resolve('RemoveTaskUseCase');
    return await removeTaskUseCase.execute({ taskId });
  }

  async receiveSchedule(data) {
    const receiveSchedulePushUseCase = this.container.resolve('ReceiveSchedulePushUseCase');
    return await receiveSchedulePushUseCase.execute({ data });
  }

  async agenda(windowDays) {
    const agendaUseCase = this.container.resolve('AgendaUseCase');
    return await agendaUseCase.execute({ windowDays });
  }
}

// Default export
export default Atlas;
