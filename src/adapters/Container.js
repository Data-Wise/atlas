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

// FileSystem repositories
import { FileSystemSessionRepository } from './repositories/FileSystemSessionRepository.js'
import { FileSystemProjectRepository } from './repositories/FileSystemProjectRepository.js'
import { FileSystemCaptureRepository } from './repositories/FileSystemCaptureRepository.js'
import { FileSystemBreadcrumbRepository } from './repositories/FileSystemBreadcrumbRepository.js'

// SQLite repositories
import { SQLiteDatabase } from './repositories/SQLiteDatabase.js'
import { SQLiteProjectRepository } from './repositories/SQLiteProjectRepository.js'
import { SQLiteSessionRepository } from './repositories/SQLiteSessionRepository.js'
import { SQLiteCaptureRepository } from './repositories/SQLiteCaptureRepository.js'
import { SQLiteBreadcrumbRepository } from './repositories/SQLiteBreadcrumbRepository.js'
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
import { SyncRegistryUseCase } from '../use-cases/registry/SyncRegistryUseCase.js'
import { SimpleEventPublisher } from './events/SimpleEventPublisher.js'
import { StatusFileGateway } from './gateways/StatusFileGateway.js'

export class Container {
  /**
   * Storage types supported
   */
  static STORAGE_TYPES = {
    FILESYSTEM: 'filesystem',
    SQLITE: 'sqlite'
  }

  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Data directory path
   * @param {string} [options.storage='filesystem'] - Storage type: 'filesystem' or 'sqlite'
   * @param {string} [options.detectorScriptPath] - Path to project detector script
   */
  constructor(options = {}) {
    this.instances = {}

    // Configuration - use ~/.atlas by default for atlas
    this.config = {
      dataDir: options.dataDir || join(homedir(), '.atlas'),
      storage: options.storage || Container.STORAGE_TYPES.FILESYSTEM,
      detectorScriptPath: options.detectorScriptPath || null
    }

    // Validate storage type
    if (!Object.values(Container.STORAGE_TYPES).includes(this.config.storage)) {
      throw new Error(`Invalid storage type: ${this.config.storage}. Use 'filesystem' or 'sqlite'.`)
    }
  }

  /**
   * Check if using SQLite storage
   */
  usingSQLite() {
    return this.config.storage === Container.STORAGE_TYPES.SQLITE
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

  /**
   * Get the SQLite database instance (shared across all SQLite repositories)
   */
  getDatabase() {
    return this._resolve('database', () => {
      const dbPath = join(this.config.dataDir, 'atlas.db')
      const db = new SQLiteDatabase(dbPath)
      db.init()
      return db
    })
  }

  getSessionRepository() {
    return this._resolve('sessionRepository', () => {
      if (this.usingSQLite()) {
        return new SQLiteSessionRepository(this.getDatabase())
      }
      const filePath = join(this.config.dataDir, 'sessions.json')
      return new FileSystemSessionRepository(filePath)
    })
  }

  getProjectRepository() {
    return this._resolve('projectRepository', () => {
      if (this.usingSQLite()) {
        return new SQLiteProjectRepository(this.getDatabase())
      }
      const filePath = join(this.config.dataDir, 'projects.json')
      return new FileSystemProjectRepository(filePath, this.config.detectorScriptPath)
    })
  }

  /**
   * Get FileSystem project repository for scanning
   * (always uses FileSystem since scanning is a filesystem operation)
   */
  getFileSystemProjectRepository() {
    return this._resolve('fsProjectRepository', () => {
      const filePath = join(this.config.dataDir, 'projects.json')
      return new FileSystemProjectRepository(filePath, this.config.detectorScriptPath)
    })
  }

  getCaptureRepository() {
    return this._resolve('captureRepository', () => {
      if (this.usingSQLite()) {
        return new SQLiteCaptureRepository(this.getDatabase())
      }
      return new FileSystemCaptureRepository(this.config.dataDir)
    })
  }

  getBreadcrumbRepository() {
    return this._resolve('breadcrumbRepository', () => {
      if (this.usingSQLite()) {
        return new SQLiteBreadcrumbRepository(this.getDatabase())
      }
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
  // USE CASES - Registry
  // ============================================================================

  getSyncRegistryUseCase() {
    return this._resolve('syncRegistryUseCase', () => {
      return new SyncRegistryUseCase({
        projectRepository: this.getProjectRepository(),
        statusFileGateway: this.getStatusFileGateway(),
        fileSystemProjectRepository: this.getFileSystemProjectRepository()
      })
    })
  }

  // ============================================================================
  // GATEWAYS (Infrastructure Layer)
  // ============================================================================

  getStatusFileGateway() {
    return this._resolve('statusFileGateway', () => {
      return new StatusFileGateway()
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
    // Close database if it exists
    if (this.instances.database) {
      this.instances.database.close()
    }
    this.instances = {}
  }

  /**
   * Close the container and release resources
   */
  close() {
    if (this.instances.database) {
      this.instances.database.close()
    }
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

      // Registry use cases
      'SyncRegistryUseCase': () => this.getSyncRegistryUseCase(),

      // Gateways
      'StatusFileGateway': () => this.getStatusFileGateway(),

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
      getTrail: this.getGetTrailUseCase(),

      // Registry
      syncRegistry: this.getSyncRegistryUseCase()
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
