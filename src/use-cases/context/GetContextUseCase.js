/**
 * GetContextUseCase - Reconstruct context ("Where was I?")
 * 
 * @module use-cases/context/GetContextUseCase
 */

export class GetContextUseCase {
  constructor({ projectRepository, sessionRepository, captureRepository, breadcrumbRepository }) {
    this.projectRepository = projectRepository;
    this.sessionRepository = sessionRepository;
    this.captureRepository = captureRepository;
    this.breadcrumbRepository = breadcrumbRepository;
  }

  /**
   * Get current context for a project or globally
   * @param {string} [project] - Project name (optional)
   * @returns {Promise<Object>} - Context information
   */
  async execute(project) {
    const context = {
      project: null,
      focus: null,
      status: null,
      session: null,
      recentCrumbs: [],
      inboxCount: 0,
      lastActivity: null,
    };

    // Get current session if any
    const currentSession = await this.sessionRepository.findActive();
    if (currentSession) {
      context.session = {
        project: currentSession.project,
        startTime: currentSession.startTime,
        duration: this._formatDuration(currentSession.startTime),
      };
      // Use session's project if no project specified
      if (!project) {
        project = currentSession.project;
      }
    }

    // Get project details
    if (project) {
      context.project = project;
      
      try {
        const projectData = await this.projectRepository.findByName(project);
        if (projectData) {
          context.focus = projectData.focus;
          context.status = projectData.status;
          context.lastActivity = projectData.lastActivity;
        }
      } catch (e) {
        // Project not in registry, but may still have context
      }

      // Get recent breadcrumbs for project
      if (this.breadcrumbRepository) {
        const crumbs = await this.breadcrumbRepository.findRecent(project, 5);
        context.recentCrumbs = crumbs.map(c => ({
          text: c.text,
          timestamp: c.createdAt,
          ago: this._formatAgo(c.createdAt),
        }));
      }

      // Get inbox count for project
      if (this.captureRepository) {
        const inbox = await this.captureRepository.findByStatus('inbox');
        context.inboxCount = inbox.filter(i => i.project === project).length;
      }
    }

    return context;
  }

  _formatDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const minutes = Math.floor((now - start) / 60000);
    
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  _formatAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const minutes = Math.floor((now - date) / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

export default GetContextUseCase;
