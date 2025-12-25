/**
 * Atlas - Project State Engine
 * 
 * Clean Architecture implementation for project registry,
 * session management, capture, and context reconstruction.
 * 
 * @module @data-wise/atlas
 */

import { Container } from './adapters/Container.js';

// Re-export domain entities for library consumers
export { Project } from './domain/entities/Project.js';
export { Session } from './domain/entities/Session.js';
export { Task } from './domain/entities/Task.js';

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
  constructor(options = {}) {
    this.configPath = options.configPath || this._defaultConfigPath();
    this.container = new Container(this.configPath);
    
    // Initialize subsystems
    this.projects = new ProjectsAPI(this.container);
    this.sessions = new SessionsAPI(this.container);
    this.capture = new CaptureAPI(this.container);
    this.context = new ContextAPI(this.container);
  }

  _defaultConfigPath() {
    return process.env.ATLAS_CONFIG || `${process.env.HOME}/.atlas`;
  }

  /**
   * Initialize atlas configuration
   */
  async init(options = {}) {
    const { global: isGlobal = false } = options;
    // Implementation will create config directory and initial files
    return { success: true, message: `Atlas initialized at ${this.configPath}` };
  }

  /**
   * Sync registry from .STATUS files
   */
  async sync(options = {}) {
    const scanUseCase = this.container.resolve('ScanProjectsUseCase');
    const projects = await scanUseCase.execute();
    return {
      success: true,
      count: projects.length,
      message: `Synced ${projects.length} projects from .STATUS files`
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
            console.log(`${k}="${v}"`);
          });
        }
        break;
      default: // table
        console.table(data);
    }
  }

  formatStatus(status) {
    if (!status) {
      console.log('No status available');
      return;
    }
    console.log(`📁 ${status.project}`);
    console.log(`   Status: ${status.status}`);
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
    if (context.session) console.log(`Session: ${context.session.duration}`);
    if (context.recentCrumbs?.length) {
      console.log('\nRecent breadcrumbs:');
      context.recentCrumbs.forEach(c => {
        console.log(`  🍞 ${c.text} (${c.ago})`);
      });
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
      console.log(`${i + 1}. ${icon} ${item.text}`);
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
      console.log(`${crumb.timestamp} │ ${crumb.text}`);
      if (crumb.project) console.log(`           └─ ${crumb.project}`);
    });
  }
}

/**
 * Projects API - Registry operations
 */
class ProjectsAPI {
  constructor(container) {
    this.container = container;
  }

  async register(path, options = {}) {
    // Will use RegisterProjectUseCase
    return { success: true, message: `Registered: ${path}` };
  }

  async unregister(name) {
    return { success: true, message: `Unregistered: ${name}` };
  }

  async list(options = {}) {
    const scanUseCase = this.container.resolve('ScanProjectsUseCase');
    const projects = await scanUseCase.execute();
    
    // Apply filters
    let filtered = projects;
    if (options.status) {
      filtered = filtered.filter(p => p.status === options.status);
    }
    if (options.tag) {
      filtered = filtered.filter(p => p.tags?.includes(options.tag));
    }
    
    return filtered.map(p => ({
      name: p.name,
      path: p.path,
      status: p.status,
      type: p.type
    }));
  }

  async get(name) {
    const statusUseCase = this.container.resolve('GetStatusUseCase');
    return await statusUseCase.execute(name);
  }

  async setFocus(name, focus) {
    // Will use UpdateStatusUseCase
    return { success: true };
  }

  async getFocus(name) {
    const project = await this.get(name);
    return project?.focus;
  }

  async setStatus(name, status) {
    return { success: true };
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
    const session = await createSession.execute({ project });
    return {
      project: session.project,
      focus: session.focus,
      startTime: session.startTime
    };
  }

  async end(note) {
    const endSession = this.container.resolve('EndSessionUseCase');
    const result = await endSession.execute({ note });
    return {
      duration: result.duration,
      note
    };
  }

  async current() {
    // Get current active session
    return null; // Will be implemented
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
    // Will use CaptureIdeaUseCase (new)
    return {
      id: Date.now(),
      text,
      type: options.type || 'idea',
      project: options.project,
      timestamp: new Date().toISOString()
    };
  }

  async inbox(options = {}) {
    // Will use GetInboxUseCase (new)
    return [];
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
    // Will use GetContextUseCase (new)
    return {
      project,
      focus: null,
      session: null,
      recentCrumbs: []
    };
  }

  async breadcrumb(text, project) {
    // Will use LogBreadcrumbUseCase (new)
    return { success: true };
  }

  async trail(project, days = 7) {
    // Will use GetTrailUseCase (new)
    return [];
  }

  async getStatus(project) {
    const statusUseCase = this.container.resolve('GetStatusUseCase');
    return await statusUseCase.execute(project);
  }
}

// Default export
export default Atlas;
