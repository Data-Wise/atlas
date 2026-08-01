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

import { join } from 'node:path'
import { resolveConfigDir } from '../utils/configPath.js'

// FileSystem repositories
import { FileSystemSessionRepository } from './repositories/FileSystemSessionRepository.js'
import { FileSystemProjectRepository } from './repositories/FileSystemProjectRepository.js'
import { FileSystemCaptureRepository } from './repositories/FileSystemCaptureRepository.js'
import { FileSystemBreadcrumbRepository } from './repositories/FileSystemBreadcrumbRepository.js'
import { FileSystemTaskRepository } from './repositories/FileSystemTaskRepository.js'
import { FileSystemScheduleRecordRepository } from './repositories/FileSystemScheduleRecordRepository.js'

// SQLite repositories
import { SQLiteDatabase } from './repositories/SQLiteDatabase.js'
import { SQLiteProjectRepository } from './repositories/SQLiteProjectRepository.js'
import { SQLiteSessionRepository } from './repositories/SQLiteSessionRepository.js'
import { SQLiteCaptureRepository } from './repositories/SQLiteCaptureRepository.js'
import { SQLiteBreadcrumbRepository } from './repositories/SQLiteBreadcrumbRepository.js'
import { SQLiteTaskRepository } from './repositories/SQLiteTaskRepository.js'
import { SQLiteScheduleRecordRepository } from './repositories/SQLiteScheduleRecordRepository.js'
import { CreateSessionUseCase } from '../use-cases/session/CreateSessionUseCase.js'
import { EndSessionUseCase } from '../use-cases/session/EndSessionUseCase.js'
import { ScanProjectsUseCase } from '../use-cases/project/ScanProjectsUseCase.js'
import { GetStatusUseCase } from '../use-cases/project/GetStatusUseCase.js'
import { GetRecentProjectsUseCase } from '../use-cases/project/GetRecentProjectsUseCase.js'
import { CaptureIdeaUseCase } from '../use-cases/capture/CaptureIdeaUseCase.js'
import { GetInboxUseCase } from '../use-cases/capture/GetInboxUseCase.js'
import { TriageInboxUseCase } from '../use-cases/capture/TriageInboxUseCase.js'
import { GetContextUseCase } from '../use-cases/context/GetContextUseCase.js'
import { LogBreadcrumbUseCase } from '../use-cases/context/LogBreadcrumbUseCase.js'
import { GetTrailUseCase } from '../use-cases/context/GetTrailUseCase.js'
import { GetDigestUseCase } from '../use-cases/context/GetDigestUseCase.js'
import { SyncRegistryUseCase } from '../use-cases/registry/SyncRegistryUseCase.js'
import { SyncFromStatusUseCase } from '../use-cases/registry/SyncFromStatusUseCase.js'
import { RegisterProjectUseCase } from '../use-cases/registry/RegisterProjectUseCase.js'
import { UpdateStatusUseCase } from '../use-cases/status/UpdateStatusUseCase.js'
import { GetSessionStatsUseCase } from '../use-cases/session/GetSessionStatsUseCase.js'
import { ExportSessionsUseCase } from '../use-cases/session/ExportSessionsUseCase.js'
import { PlanDayUseCase } from '../use-cases/session/PlanDayUseCase.js'
import { AddTaskUseCase } from '../use-cases/task/AddTaskUseCase.js'
import { ListTasksUseCase } from '../use-cases/task/ListTasksUseCase.js'
import { CompleteTaskUseCase } from '../use-cases/task/CompleteTaskUseCase.js'
import { RemoveTaskUseCase } from '../use-cases/task/RemoveTaskUseCase.js'
import { ReceiveSchedulePushUseCase } from '../use-cases/task/ReceiveSchedulePushUseCase.js'
import { AgendaUseCase } from '../use-cases/task/AgendaUseCase.js'
import { SimpleEventPublisher } from './events/SimpleEventPublisher.js'
import { StatusFileGateway } from './gateways/StatusFileGateway.js'
import { StatusFileParser } from './gateways/StatusFileParser.js'
import { GitGateway } from './gateways/GitGateway.js'
import { GuardsFileNudgeStore } from './gateways/GuardsFileNudgeStore.js'
import { LaunchdNudgeScheduler } from './gateways/LaunchdNudgeScheduler.js'
import { AddNudgeUseCase } from '../use-cases/nudge/AddNudgeUseCase.js'
import { FireNudgeUseCase } from '../use-cases/nudge/FireNudgeUseCase.js'
import { AckNudgeUseCase } from '../use-cases/nudge/AckNudgeUseCase.js'

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

    // Configuration - defaults via the shared resolver (SPEC-xdg-config-migration)
    this.config = {
      dataDir: options.dataDir || resolveConfigDir(),
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

  getTaskRepository() {
    return this._resolve('taskRepository', () => {
      if (this.usingSQLite()) {
        return new SQLiteTaskRepository(this.getDatabase())
      }
      return new FileSystemTaskRepository(this.config.dataDir)
    })
  }

  getScheduleRecordRepository() {
    return this._resolve('scheduleRecordRepository', () => {
      if (this.usingSQLite()) {
        return new SQLiteScheduleRecordRepository(this.getDatabase())
      }
      return new FileSystemScheduleRecordRepository(this.config.dataDir)
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
      return new EndSessionUseCase(
        this.getSessionRepository(),
        this.getProjectRepository(),
        this.getGitGateway(),
        this.getSyncFromStatusUseCase()
      )
    })
  }

  getGetSessionStatsUseCase() {
    return this._resolve('getSessionStatsUseCase', () => {
      return new GetSessionStatsUseCase(this.getSessionRepository())
    })
  }

  getExportSessionsUseCase() {
    return this._resolve('exportSessionsUseCase', () => {
      return new ExportSessionsUseCase(this.getSessionRepository())
    })
  }

  getPlanDayUseCase() {
    return this._resolve('planDayUseCase', () => {
      return new PlanDayUseCase({
        sessionRepository: this.getSessionRepository(),
        captureRepository: this.getCaptureRepository(),
        projectRepository: this.getProjectRepository(),
        statusFileParser: this.getStatusFileParser()
      })
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

  getTriageInboxUseCase() {
    return this._resolve('triageInboxUseCase', () => {
      return new TriageInboxUseCase({
        captureRepository: this.getCaptureRepository(),
        projectRepository: this.getProjectRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  // ============================================================================
  // USE CASES - Task
  // ============================================================================

  getAddTaskUseCase() {
    return this._resolve('addTaskUseCase', () => {
      return new AddTaskUseCase({
        taskRepository: this.getTaskRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  getListTasksUseCase() {
    return this._resolve('listTasksUseCase', () => {
      return new ListTasksUseCase({
        taskRepository: this.getTaskRepository()
      })
    })
  }

  getCompleteTaskUseCase() {
    return this._resolve('completeTaskUseCase', () => {
      return new CompleteTaskUseCase({
        taskRepository: this.getTaskRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  getRemoveTaskUseCase() {
    return this._resolve('removeTaskUseCase', () => {
      return new RemoveTaskUseCase({
        taskRepository: this.getTaskRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  getReceiveSchedulePushUseCase() {
    return this._resolve('receiveSchedulePushUseCase', () => {
      return new ReceiveSchedulePushUseCase({
        scheduleRecordRepository: this.getScheduleRecordRepository(),
        eventPublisher: this.getEventPublisher()
      })
    })
  }

  getAgendaUseCase() {
    return this._resolve('agendaUseCase', () => {
      return new AgendaUseCase({
        taskRepository: this.getTaskRepository(),
        scheduleRecordRepository: this.getScheduleRecordRepository(),
        projectRepository: this.getProjectRepository()
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

  getGetDigestUseCase() {
    return this._resolve('getDigestUseCase', () => {
      return new GetDigestUseCase({
        getContextUseCase: this.getGetContextUseCase(),
        planDayUseCase: this.getPlanDayUseCase(),
        statusFileGateway: this.getStatusFileGateway(),
        projectRepository: this.getProjectRepository()
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

  getRegisterProjectUseCase() {
    return this._resolve('registerProjectUseCase', () => {
      return new RegisterProjectUseCase({
        projectRepository: this.getProjectRepository(),
        statusFileGateway: this.getStatusFileGateway()
      })
    })
  }

  getSyncFromStatusUseCase() {
    return this._resolve('syncFromStatusUseCase', () => {
      return new SyncFromStatusUseCase({
        projectRepository: this.getProjectRepository(),
        statusFileParser: this.getStatusFileParser()
      })
    })
  }

  // ============================================================================
  // USE CASES - Status
  // ============================================================================

  getUpdateStatusUseCase() {
    return this._resolve('updateStatusUseCase', () => {
      return new UpdateStatusUseCase({
        projectRepository: this.getProjectRepository(),
        statusFileGateway: this.getStatusFileGateway()
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

  getStatusFileParser() {
    return this._resolve('statusFileParser', () => {
      return new StatusFileParser()
    })
  }

  getGitGateway() {
    return this._resolve('gitGateway', () => {
      return new GitGateway()
    })
  }

  /**
   * Nudge persistence. Registered as a gateway, NOT via the storage-branching
   * repository accessors above: nudges live in the shared guards.json
   * regardless of the configured backend, so a SQLite variant can never
   * legitimately exist. See SPEC Design §1.
   */
  getNudgeStore() {
    return this._resolve('nudgeStore', () => {
      return new GuardsFileNudgeStore()
    })
  }

  getNudgeScheduler() {
    return this._resolve('nudgeScheduler', () => {
      return new LaunchdNudgeScheduler()
    })
  }

  // ============================================================================
  // USE CASES - Nudge
  // ============================================================================

  getAddNudgeUseCase() {
    return this._resolve('addNudgeUseCase', () => {
      return new AddNudgeUseCase({
        nudgeStore: this.getNudgeStore(),
        scheduler: this.getNudgeScheduler()
      })
    })
  }

  getFireNudgeUseCase() {
    return this._resolve('fireNudgeUseCase', () => {
      return new FireNudgeUseCase({
        nudgeStore: this.getNudgeStore()
      })
    })
  }

  getAckNudgeUseCase() {
    return this._resolve('ackNudgeUseCase', () => {
      return new AckNudgeUseCase({
        nudgeStore: this.getNudgeStore(),
        scheduler: this.getNudgeScheduler()
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
      'GetSessionStatsUseCase': () => this.getGetSessionStatsUseCase(),
      'ExportSessionsUseCase': () => this.getExportSessionsUseCase(),
      'PlanDayUseCase': () => this.getPlanDayUseCase(),
      
      // Capture use cases
      'CaptureIdeaUseCase': () => this.getCaptureIdeaUseCase(),
      'GetInboxUseCase': () => this.getGetInboxUseCase(),
      'TriageInboxUseCase': () => this.getTriageInboxUseCase(),

      // Task use cases
      'AddTaskUseCase': () => this.getAddTaskUseCase(),
      'ListTasksUseCase': () => this.getListTasksUseCase(),
      'CompleteTaskUseCase': () => this.getCompleteTaskUseCase(),
      'RemoveTaskUseCase': () => this.getRemoveTaskUseCase(),
      'ReceiveSchedulePushUseCase': () => this.getReceiveSchedulePushUseCase(),
      'AgendaUseCase': () => this.getAgendaUseCase(),

      // Context use cases
      'GetContextUseCase': () => this.getGetContextUseCase(),
      'LogBreadcrumbUseCase': () => this.getLogBreadcrumbUseCase(),
      'GetTrailUseCase': () => this.getGetTrailUseCase(),
      'GetDigestUseCase': () => this.getGetDigestUseCase(),

      // Registry use cases
      'SyncRegistryUseCase': () => this.getSyncRegistryUseCase(),
      'SyncFromStatusUseCase': () => this.getSyncFromStatusUseCase(),
      'RegisterProjectUseCase': () => this.getRegisterProjectUseCase(),

      // Status use cases
      'UpdateStatusUseCase': () => this.getUpdateStatusUseCase(),

      // Gateways
      'StatusFileGateway': () => this.getStatusFileGateway(),
      'StatusFileParser': () => this.getStatusFileParser(),
      'GitGateway': () => this.getGitGateway(),
      'NudgeStore': () => this.getNudgeStore(),
      'AddNudgeUseCase': () => this.getAddNudgeUseCase(),
      'FireNudgeUseCase': () => this.getFireNudgeUseCase(),
      'AckNudgeUseCase': () => this.getAckNudgeUseCase(),

      // Repositories
      'SessionRepository': () => this.getSessionRepository(),
      'ProjectRepository': () => this.getProjectRepository(),
      'CaptureRepository': () => this.getCaptureRepository(),
      'BreadcrumbRepository': () => this.getBreadcrumbRepository(),
      'TaskRepository': () => this.getTaskRepository(),
      'ScheduleRecordRepository': () => this.getScheduleRecordRepository(),
      
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
      getSessionStats: this.getGetSessionStatsUseCase(),
      exportSessions: this.getExportSessionsUseCase(),
      planDay: this.getPlanDayUseCase(),

      // Project
      scanProjects: this.getScanProjectsUseCase(),
      getStatus: this.getGetStatusUseCase(),
      getRecentProjects: this.getGetRecentProjectsUseCase(),
      
      // Capture
      captureIdea: this.getCaptureIdeaUseCase(),
      getInbox: this.getGetInboxUseCase(),
      triageInbox: this.getTriageInboxUseCase(),

      // Task
      addTask: this.getAddTaskUseCase(),
      listTasks: this.getListTasksUseCase(),
      completeTask: this.getCompleteTaskUseCase(),
      removeTask: this.getRemoveTaskUseCase(),
      receiveSchedulePush: this.getReceiveSchedulePushUseCase(),
      agenda: this.getAgendaUseCase(),

      // Context
      getContext: this.getGetContextUseCase(),
      logBreadcrumb: this.getLogBreadcrumbUseCase(),
      getTrail: this.getGetTrailUseCase(),

      // Registry
      syncRegistry: this.getSyncRegistryUseCase(),
      syncFromStatus: this.getSyncFromStatusUseCase(),
      registerProject: this.getRegisterProjectUseCase(),

      // Status
      updateStatus: this.getUpdateStatusUseCase()
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
      breadcrumbs: this.getBreadcrumbRepository(),
      tasks: this.getTaskRepository(),
      scheduleRecords: this.getScheduleRecordRepository()
    }
  }
}

/**
 * Create a container with default configuration
 */
export function createContainer(options = {}) {
  return new Container(options)
}
