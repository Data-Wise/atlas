/**
 * ParkContextUseCase - Park current context for later restoration
 *
 * ADHD-friendly feature: When you need to context switch, park your
 * current state so you can return to it later without losing your place.
 *
 * Captures:
 * - Current session (project, task, duration)
 * - Recent breadcrumbs
 * - Focus text
 * - User-provided note about where they were
 */

import { randomUUID } from 'crypto';
import { Capture } from '../../domain/entities/Capture.js';

export class ParkContextUseCase {
  constructor({ sessionRepository, breadcrumbRepository, projectRepository, captureRepository }) {
    this.sessionRepository = sessionRepository;
    this.breadcrumbRepository = breadcrumbRepository;
    this.projectRepository = projectRepository;
    this.captureRepository = captureRepository;
  }

  /**
   * Park the current context
   * @param {string} note - Optional note about current state
   * @param {object} options - Options
   * @returns {object} Parked context
   */
  async execute(note = '', options = {}) {
    // Get current session
    const currentSession = await this.sessionRepository.findActive();

    if (!currentSession && !options.force) {
      return {
        success: false,
        message: 'No active session to park. Use --force to park without a session.'
      };
    }

    // Get recent breadcrumbs (last 5)
    const breadcrumbs = currentSession
      ? await this.breadcrumbRepository.findRecent(currentSession.project, 5)
      : [];

    // Get project details
    const project = currentSession
      ? await this.projectRepository.findById(currentSession.project)
      : null;

    // Calculate session duration
    const sessionDuration = currentSession
      ? Math.floor((Date.now() - new Date(currentSession.startTime).getTime()) / 60000)
      : 0;

    // Create parked context
    const parkedContext = {
      id: randomUUID(),
      parkedAt: new Date().toISOString(),
      project: currentSession?.project || null,
      projectName: project?.name || currentSession?.project || 'No project',
      task: currentSession?.task || null,
      note: note || null,
      sessionDuration,
      focus: project?.focus || null,
      breadcrumbs: breadcrumbs.map(b => ({
        text: b.text,
        createdAt: b.createdAt
      })),
      // Store session state for potential restoration
      sessionState: currentSession ? {
        startTime: currentSession.startTime,
        task: currentSession.task
      } : null
    };

    // Save to captures with parked status
    const capture = new Capture({
      id: parkedContext.id,
      type: 'parked',
      status: 'parked',
      text: this._formatParkSummary(parkedContext),
      project: parkedContext.project,
      context: parkedContext,  // Store full context as metadata
      createdAt: new Date(parkedContext.parkedAt)
    });
    await this.captureRepository.save(capture);

    // End current session if one exists
    if (currentSession && !options.keepSession) {
      currentSession.end('interrupted');
      await this.sessionRepository.save(currentSession);
    }

    return {
      success: true,
      parkedContext,
      message: this._formatParkMessage(parkedContext)
    };
  }

  _formatParkSummary(ctx) {
    const parts = [`Parked: ${ctx.projectName}`];
    if (ctx.task) parts.push(`Task: ${ctx.task}`);
    if (ctx.note) parts.push(`Note: ${ctx.note}`);
    if (ctx.sessionDuration > 0) parts.push(`Duration: ${ctx.sessionDuration}m`);
    return parts.join(' | ');
  }

  _formatParkMessage(ctx) {
    const lines = ['🅿️  Context parked'];
    lines.push(`   Project: ${ctx.projectName}`);
    if (ctx.task) lines.push(`   Task: ${ctx.task}`);
    if (ctx.sessionDuration > 0) lines.push(`   Duration: ${ctx.sessionDuration}m`);
    if (ctx.note) lines.push(`   Note: ${ctx.note}`);
    if (ctx.breadcrumbs.length > 0) {
      lines.push(`   Breadcrumbs: ${ctx.breadcrumbs.length} saved`);
    }
    lines.push('');
    lines.push('   Restore with: atlas unpark');
    return lines.join('\n');
  }
}
