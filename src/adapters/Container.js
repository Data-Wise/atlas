/**
 * Dependency Injection Container
 *
 * Wires together all layers of the Clean Architecture:
 * - Adapters (repositories)
 * - Use Cases
 * - Domain (entities, value objects)
 *
 * This is a simple container that creates and caches instances.
 * For production, could use a library like awilix or bottlejs.
 */

import { join } from 'path'
import { homedir } from 'os'
import { FileSystemSessionRepository } from './repositories/FileSystemSessionRepository.js'
import { FileSystemProjectRepository } from './repositories/FileSystemProjectRepository.js'
import { FileSystemCaptureRepository } from './repositories/FileSystemCaptureRepository.js'
import { FileSystemBreadcrumbRepository } from './repositories/FileSystemBreadcrumbRepository.js'
import { CreateSessionUseCase } from '../use-cases/session/CreateSessionUseCase.js'
import { EndSessionUseCase } from '../use-cases/session/EndSessionUseCase.js'
import { ScanProjectsUseCase } from '../use-cases/project/ScanProjectsUseCase.js'
import { GetStatusUseCase } from '../use-cases/project/GetStatusUseCase.js'
import { GetRecentProjectsUseCase } from '../use-cases/project/GetRecentProjectsUseCase.js'
import { CaptureIdeaUseCase } from '../use-cases/capture/CaptureIdeaUseCase.js'
import { GetInboxUseCase } from '../use-cases/capture/GetInboxUseCase.js'
import { GetContextUseCase } from '../use-cases/context/GetContextUseCase.js'
import { LogBreadcrumbUseCase } from '../use-cases/context/LogBreadcrumbUseCase.js'
import { GetTrailUseCase } from '../use-cases/context/GetTrailUseCase.js'
import { SimpleEventPublisher } from './events/SimpleEventPublisher.js'

export class Container {
  constructor(options = {}) {
    this.instances = {}

    // Configuration - use ~/.atlas by default for atlas
    this.config = {
      dataDir: options.dataDir || join(homedir(), '.atlas'),
      detectorScriptPath: options.detectorScriptPath || null
    }
  }

  /**
   * Get or create an instance
   * @private
   */
  _resolve(name, factory) {
    if (!this.instances[name]) {
      this.instances[name] = factory()
    }
    return this.instances[name]
  }

  // ============================================================================
  // REPOSITORIES (Adapters Layer)
  // ============================================================================

  getSessionRepository() {
    return this._resolve('sessionRepository', () => {
      const filePath = join(this.config.dataDir, 'sessions.json')
      return new FileSystemSessionRepository(filePath)
    })
  }

  getProjectRepository() {
    return this._resolve('projectRepository', () => {
      const filePath = join(this.config.dataDir, 'projects.json')
      return new FileSystemProjectRepository(filePath, this.config.detectorScriptPath)
    })
  }

  getCaptureRepository() {
    return this._resolve('captureRepository', () => {
      return new FileSystemCaptureRepository(this.config.dataDir)
    })
  }

  getBreadcrumbRepository() {
    return this._resolve('breadcrumbRepository', () => {
      return new FileSystemBreadcrumbRepository(this.config.dataDir)
    })
  }

  // ============================================================================
  // USE CASES - Session (Application Layer)
  // ============================================================================

  getCreateSessionUseCase() {
    return this._resolve('createSessionUseCase', () => {
      return new CreateSessionUseCase(this.getSessionRepository(), this.getProjectRepository())
    })
  }

  getEndSessionUseCase() {
    return this._resolve('endSessionUseCase', () => {
      return new EndSessionUseCase(this.getSessionRepository(), this.getProjectRepository())
    })
  }

  // ============================================================================
  // USE CASES - Project
  // ============================================================================

  getScanProjectsUseCase() {
    return this._resolve('scanProjectsUseCase', () => {
      return new ScanProjectsUseCase(this.getProjectRepository())
    })
  }

  getGetStatusUseCase() {
    return this._resolve('getStatusUseCase', () => {
      return new GetStatusUseCase(this.getSessionRepository(), this.getProjectRepository())
    })
  }

  getGetRecentProjectsUseCase() {
    return this._resolve('getRecentProjectsUseCase', () => {
      return new GetRecentProjectsUseCase(this.getProjectRepository())
    })
  }

  // ============================================================================
  // USE CASES - Capture
  // ============================================================================

  getCaptureIdeaUseCase() {
    return this._resolve('captureIdeaUseCase', () => {
      return new CaptureIdeaUseCase({
        captureRepository: this.getCaptureRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  getGetInboxUseCase() {
    return this._resolve('getInboxUseCase', () => {
      return new GetInboxUseCase({
        captureRepository: this.getCaptureRepository()
      })
    })
  }

  // ============================================================================
  // USE CASES - Context
  // ============================================================================

  getGetContextUseCase() {
    return this._resolve('getContextUseCase', () => {
      return new GetContextUseCase({
        projectRepository: this.getProjectRepository(),
        sessionRepository: this.getSessionRepository(),
        captureRepository: this.getCaptureRepository(),
        breadcrumbRepository: this.getBreadcrumbRepository()
      })
    })
  }

  getLogBreadcrumbUseCase() {
    return this._resolve('logBreadcrumbUseCase', () => {
      return new LogBreadcrumbUseCase({
        breadcrumbRepository: this.getBreadcrumbRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  getGetTrailUseCase() {
    return this._resolve('getTrailUseCase', () => {
      return new GetTrailUseCase({
        breadcrumbRepository: this.getBreadcrumbRepository()
      })
    })
  }

  // ============================================================================
  // SERVICES (Infrastructure Layer)
  // ============================================================================

  getEventPublisher() {
    return this._resolve('eventPublisher', () => {
      return new SimpleEventPublisher()
    })
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  clear() {
    this.instances = {}
  }

  /**
   * Resolve a use case by name
   * Maps string names to getter methods for convenient access
   */
  resolve(name) {
    const map = {
      // Project use cases
      'GetStatusUseCase': () => this.getGetStatusUseCase(),
      'ScanProjectsUseCase': () => this.getScanProjectsUseCase(),
      'GetRecentProjectsUseCase': () => this.getGetRecentProjectsUseCase(),
      
      // Session use cases
      'CreateSessionUseCase': () => this.getCreateSessionUseCase(),
      'EndSessionUseCase': () => this.getEndSessionUseCase(),
      
      // Capture use cases
      'CaptureIdeaUseCase': () => this.getCaptureIdeaUseCase(),
      'GetInboxUseCase': () => this.getGetInboxUseCase(),
      
      // Context use cases
      'GetContextUseCase': () => this.getGetContextUseCase(),
      'LogBreadcrumbUseCase': () => this.getLogBreadcrumbUseCase(),
      'GetTrailUseCase': () => this.getGetTrailUseCase(),
      
      // Repositories
      'SessionRepository': () => this.getSessionRepository(),
      'ProjectRepository': () => this.getProjectRepository(),
      'CaptureRepository': () => this.getCaptureRepository(),
      'BreadcrumbRepository': () => this.getBreadcrumbRepository(),
      
      // Services
      'EventPublisher': () => this.getEventPublisher()
    };
    
    if (!map[name]) {
      throw new Error(`Unknown dependency: ${name}`);
    }
    return map[name]();
  }

  /**
   * Get all use cases
   */
  getUseCases() {
    return {
      // Session
      createSession: this.getCreateSessionUseCase(),
      endSession: this.getEndSessionUseCase(),
      
      // Project
      scanProjects: this.getScanProjectsUseCase(),
      getStatus: this.getGetStatusUseCase(),
      getRecentProjects: this.getGetRecentProjectsUseCase(),
      
      // Capture
      captureIdea: this.getCaptureIdeaUseCase(),
      getInbox: this.getGetInboxUseCase(),
      
      // Context
      getContext: this.getGetContextUseCase(),
      logBreadcrumb: this.getLogBreadcrumbUseCase(),
      getTrail: this.getGetTrailUseCase()
    }
  }

  /**
   * Get all repositories
   */
  getRepositories() {
    return {
      sessions: this.getSessionRepository(),
      projects: this.getProjectRepository(),
      captures: this.getCaptureRepository(),
      breadcrumbs: this.getBreadcrumbRepository()
    }
  }
}

/**
 * Create a container with default configuration
 */
export function createContainer(options = {}) {
  return new Container(options)
}
