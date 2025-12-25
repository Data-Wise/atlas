/**
 * RegisterProjectUseCase
 *
 * Manually register a project in the registry.
 * Used when you want to add a project without scanning.
 */

import { Project } from '../../domain/entities/Project.js'
import { ProjectType } from '../../domain/value-objects/ProjectType.js'

export class RegisterProjectUseCase {
  /**
   * @param {Object} dependencies
   * @param {IProjectRepository} dependencies.projectRepository - Project storage
   * @param {StatusFileGateway} dependencies.statusFileGateway - .STATUS file reader
   */
  constructor({ projectRepository, statusFileGateway }) {
    this.projectRepository = projectRepository
    this.statusFileGateway = statusFileGateway
  }

  /**
   * Register a project
   *
   * @param {Object} input
   * @param {string} input.path - Project directory path
   * @param {string} [input.name] - Project name (defaults to directory name)
   * @param {string} [input.type] - Project type (auto-detected if not provided)
   * @param {string[]} [input.tags] - Tags to apply
   * @param {string} [input.status] - Initial status (active|paused|archived)
   * @param {string} [input.description] - Project description
   * @returns {Promise<RegisterResult>}
   */
  async execute(input) {
    const { path } = input

    if (!path) {
      throw new Error('RegisterProjectUseCase: path is required')
    }

    // Check if project already exists
    const existing = await this.projectRepository.findByPath(path)
    if (existing) {
      return {
        success: false,
        project: existing,
        message: `Project already registered: ${existing.name}`
      }
    }

    // Determine project name
    const name = input.name || this._extractProjectName(path)

    // Auto-detect project type if not provided
    const type = input.type || await this._detectProjectType(path)

    // Read .STATUS file if it exists
    const statusData = await this.statusFileGateway.read(path)

    // Create project entity
    const project = new Project(path, name, {
      type,
      path,
      description: input.description || statusData?.next?.[0]?.action || '',
      tags: input.tags || [],
      metadata: {}
    })

    // Enrich with .STATUS data
    if (statusData) {
      project.metadata.status = statusData.status || input.status || 'active'
      project.metadata.progress = statusData.progress
      project.metadata.nextAction = statusData.next?.[0]?.action
      project.metadata.nextActions = statusData.next
    } else if (input.status) {
      project.metadata.status = input.status
    }

    // Save to repository
    await this.projectRepository.save(project)

    return {
      success: true,
      project,
      message: `✓ Registered: ${name} (${type})`,
      hadStatusFile: !!statusData
    }
  }

  /**
   * Extract project name from path
   * @private
   */
  _extractProjectName(path) {
    // Get the last segment of the path
    const segments = path.split('/').filter(Boolean)
    return segments[segments.length - 1] || 'unknown'
  }

  /**
   * Auto-detect project type from directory contents
   * @private
   */
  async _detectProjectType(path) {
    const { existsSync } = await import('fs')
    const { join } = await import('path')

    const markers = [
      { file: 'package.json', type: ProjectType.NODE },
      { file: 'DESCRIPTION', type: ProjectType.R_PACKAGE },
      { file: '_quarto.yml', type: ProjectType.QUARTO },
      { file: 'pyproject.toml', type: ProjectType.PYTHON },
      { file: 'setup.py', type: ProjectType.PYTHON },
      { file: '.spacemacs', type: ProjectType.SPACEMACS },
      { file: 'mcp.json', type: ProjectType.MCP },
      { file: 'Cargo.toml', type: 'rust' },
      { file: 'go.mod', type: 'go' },
      { file: '.STATUS', type: ProjectType.GENERAL } // Has status file = tracked project
    ]

    for (const { file, type } of markers) {
      if (existsSync(join(path, file))) {
        return type
      }
    }

    return ProjectType.GENERAL
  }
}

export default RegisterProjectUseCase
