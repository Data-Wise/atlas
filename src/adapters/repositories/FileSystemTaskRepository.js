/**
 * FileSystem Task Repository
 * Stores tasks in ~/.atlas/tasks.json
 */
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { Task } from '../../domain/entities/Task.js'
import { ITaskRepository } from '../../domain/repositories/ITaskRepository.js'
import { resolveConfigDir } from '../../utils/configPath.js'

export class FileSystemTaskRepository extends ITaskRepository {
  constructor(configPath) {
    super()
    this.configPath = configPath || resolveConfigDir()
    this.filePath = path.join(this.configPath, 'tasks.json')
  }

  async _ensureFile() {
    if (!existsSync(this.configPath)) {
      await mkdir(this.configPath, { recursive: true })
    }
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, JSON.stringify({ tasks: [] }, null, 2))
    }
  }

  async _read() {
    await this._ensureFile()
    const data = await readFile(this.filePath, 'utf-8')
    return JSON.parse(data)
  }

  async _write(data) {
    await this._ensureFile()
    await writeFile(this.filePath, JSON.stringify(data, null, 2))
  }

  async findById(taskId) {
    const data = await this._read()
    const taskJson = data.tasks.find(t => t.id === taskId)
    return taskJson ? Task.fromJSON(taskJson) : null
  }

  async findAll() {
    const data = await this._read()
    return data.tasks.map(t => Task.fromJSON(t))
  }

  async findByProject(projectId) {
    const tasks = await this.findAll()
    return tasks.filter(t => t.projectId === projectId)
  }

  async findBySession(sessionId) {
    const tasks = await this.findAll()
    return tasks.filter(t => t.sessionId === sessionId)
  }

  async findIncomplete() {
    const tasks = await this.findAll()
    return tasks.filter(t => !t.completed)
  }

  async findCompleted() {
    const tasks = await this.findAll()
    return tasks.filter(t => t.completed)
  }

  async findByPriority(priority) {
    const tasks = await this.findAll()
    return tasks.filter(t => t.priority.value === priority)
  }

  async findOverdue() {
    const tasks = await this.findAll()
    return tasks.filter(t => t.isOverdue())
  }

  async findDueSoon(hours = 24) {
    const tasks = await this.findAll()
    return tasks.filter(t => t.isDueSoon(hours))
  }

  async findByTag(tag) {
    const tasks = await this.findAll()
    return tasks.filter(t => t.tags.includes(tag))
  }

  async search(query) {
    const tasks = await this.findAll()
    return tasks.filter(t => t.matchesSearch(query))
  }

  async save(task) {
    const data = await this._read()
    const existingIndex = data.tasks.findIndex(t => t.id === task.id)

    if (existingIndex >= 0) {
      data.tasks[existingIndex] = task.toJSON()
    } else {
      data.tasks.unshift(task.toJSON()) // Newest first
    }

    await this._write(data)
    return task
  }

  async delete(taskId) {
    const data = await this._read()
    const initialLength = data.tasks.length
    data.tasks = data.tasks.filter(t => t.id !== taskId)
    await this._write(data)
    return data.tasks.length < initialLength
  }

  async count(filters = {}) {
    let tasks = await this.findAll()

    if (filters.completed !== undefined) {
      tasks = tasks.filter(t => t.completed === filters.completed)
    }
    if (filters.projectId) {
      tasks = tasks.filter(t => t.projectId === filters.projectId)
    }
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority.value === filters.priority)
    }

    return tasks.length
  }
}

export default FileSystemTaskRepository
