/**
 * UnparkContextUseCase - Restore a previously parked context
 *
 * Restores:
 * - Starts a new session for the parked project
 * - Shows the saved note and breadcrumbs
 * - Provides context restoration message
 */

export class UnparkContextUseCase {
  constructor({ sessionRepository, captureRepository, projectRepository }) {
    this.sessionRepository = sessionRepository;
    this.captureRepository = captureRepository;
    this.projectRepository = projectRepository;
  }

  /**
   * Unpark and restore a context
   * @param {string} id - Optional specific parked context ID
   * @returns {object} Restoration result
   */
  async execute(id = null) {
    // Get parked contexts
    const parkedContexts = await this.getParkedContexts();

    if (parkedContexts.length === 0) {
      return {
        success: false,
        message: '🅿️  No parked contexts to restore'
      };
    }

    // Find the context to restore
    let contextToRestore;
    if (id) {
      contextToRestore = parkedContexts.find(p => p.id === id || p.id.startsWith(id));
      if (!contextToRestore) {
        return {
          success: false,
          message: `🅿️  No parked context found with ID: ${id}`
        };
      }
    } else {
      // Get most recent
      contextToRestore = parkedContexts[0];
    }

    const ctx = contextToRestore.context;

    // Check for active session
    const activeSession = await this.sessionRepository.findActive();
    if (activeSession) {
      return {
        success: false,
        message: `Cannot unpark: active session on "${activeSession.project}"\nEnd it first with: atlas session end`
      };
    }

    // Start new session for the parked project
    if (ctx.project) {
      const { Session } = await import('../../domain/entities/Session.js');
      const { randomUUID } = await import('crypto');
      const newSession = new Session(randomUUID(), ctx.project, {
        task: ctx.task || `Resumed from park: ${ctx.note || ''}`
      });
      await this.sessionRepository.save(newSession);
    }

    // Remove the parked context from captures
    await this.captureRepository.delete(contextToRestore.id);

    return {
      success: true,
      context: ctx,
      message: this._formatRestoreMessage(ctx)
    };
  }

  /**
   * Get all parked contexts
   */
  async getParkedContexts() {
    const captures = await this.captureRepository.findByStatus('parked');
    return captures
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * List parked contexts (for display)
   */
  async list() {
    const parked = await this.getParkedContexts();

    if (parked.length === 0) {
      return {
        contexts: [],
        message: '🅿️  No parked contexts'
      };
    }

    return {
      contexts: parked.map(p => ({
        id: p.id.substring(0, 8),
        project: p.context.projectName,
        task: p.context.task,
        note: p.context.note,
        duration: p.context.sessionDuration,
        parkedAt: p.context.parkedAt,
        breadcrumbs: p.context.breadcrumbs?.length || 0
      })),
      message: this._formatListMessage(parked)
    };
  }

  _formatRestoreMessage(ctx) {
    const lines = ['🔄 Context restored!'];
    lines.push('');
    lines.push(`   Project: ${ctx.projectName}`);
    if (ctx.task) lines.push(`   Task: ${ctx.task}`);
    if (ctx.note) lines.push(`   Note: ${ctx.note}`);
    if (ctx.focus) lines.push(`   Focus: ${ctx.focus}`);

    // Show time since parked
    const parkedAt = new Date(ctx.parkedAt);
    const hoursSince = Math.floor((Date.now() - parkedAt.getTime()) / 3600000);
    if (hoursSince < 1) {
      lines.push(`   Parked: ${Math.floor((Date.now() - parkedAt.getTime()) / 60000)}m ago`);
    } else if (hoursSince < 24) {
      lines.push(`   Parked: ${hoursSince}h ago`);
    } else {
      lines.push(`   Parked: ${Math.floor(hoursSince / 24)}d ago`);
    }

    // Show breadcrumbs if any
    if (ctx.breadcrumbs && ctx.breadcrumbs.length > 0) {
      lines.push('');
      lines.push('   📍 Where you left off:');
      ctx.breadcrumbs.slice(0, 3).forEach(b => {
        lines.push(`      • ${b.text}`);
      });
    }

    lines.push('');
    lines.push('   Session started. Pick up where you left off!');

    return lines.join('\n');
  }

  _formatListMessage(parked) {
    const lines = ['🅿️  Parked Contexts', ''];

    parked.forEach((p, i) => {
      const ctx = p.context;
      const id = p.id.substring(0, 8);
      const ago = this._timeAgo(new Date(ctx.parkedAt));

      lines.push(`   ${i + 1}. [${id}] ${ctx.projectName}`);
      if (ctx.task) lines.push(`      Task: ${ctx.task}`);
      if (ctx.note) lines.push(`      Note: ${ctx.note}`);
      lines.push(`      Parked: ${ago} | Duration: ${ctx.sessionDuration || 0}m`);
      lines.push('');
    });

    lines.push('   Restore with: atlas unpark [id]');

    return lines.join('\n');
  }

  _timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
