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
  }

  /**
   * Close resources (important for SQLite)
   */
  close() {
    this.container.close();
  }

  _defaultConfigPath() {
    return process.env.ATLAS_CONFIG || `${process.env.HOME}/.atlas`;
  }

  /**
   * Initialize atlas configuration
   */
  async init(options = {}) {
    const { global: isGlobal = false } = options;
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
        console.log(JSON.stringify(data, null, 2));
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

  async unregister(name) {
    const projectRepo = this.container.resolve('ProjectRepository');
    const deleted = await projectRepo.delete(name);
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
      filtered = filtered.filter(p => p.status === options.status);
    }
    if (options.tag) {
      filtered = filtered.filter(p => p.tags?.includes(options.tag));
    }

    return filtered.map(p => ({
      name: p.name,
      path: p.path,
      status: p.status || p.metadata?.status,
      type: p.type
    }));
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

  async completeNextAction(name, newAction = null) {
    const updateUseCase = this.container.resolve('UpdateStatusUseCase');
    return await updateUseCase.completeNextAction(name, newAction);
  }
}

/**
 * Sessions API - Work session management
 */
class SessionsAPI {
  constructor(container) {
    this.container = container;
  }

  async start(project) {
    const createSession = this.container.resolve('CreateSessionUseCase');
    const session = await createSession.execute({ project: project || 'default' });
    return {
      project: session.project,
      focus: session.focus,
      startTime: session.startTime
    };
  }

  async end(note) {
    const endSession = this.container.resolve('EndSessionUseCase');
    const session = await endSession.execute({ note });
    return {
      duration: session.getDuration ? `${session.getDuration()}m` : 'unknown',
      note
    };
  }

  async current() {
    const sessionRepo = this.container.resolve('SessionRepository');
    return await sessionRepo.findActive();
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

  async trail(project, days = 7) {
    const trailUseCase = this.container.resolve('GetTrailUseCase');
    return await trailUseCase.execute({ project, days });
  }

  async getStatus(project) {
    const statusUseCase = this.container.resolve('GetStatusUseCase');
    return await statusUseCase.execute(project);
  }
}

// Default export
export default Atlas;
