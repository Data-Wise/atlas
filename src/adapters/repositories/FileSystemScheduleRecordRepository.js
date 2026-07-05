/**
 * FileSystem ScheduleRecord Repository
 * Stores schedule records in ~/.atlas/schedule.json
 */
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { ScheduleRecord } from '../../domain/entities/ScheduleRecord.js'
import { IScheduleRecordRepository } from '../../domain/repositories/IScheduleRecordRepository.js'

export class FileSystemScheduleRecordRepository extends IScheduleRecordRepository {
  constructor(configPath) {
    super()
    this.configPath = configPath || `${process.env.HOME}/.atlas`
    this.filePath = path.join(this.configPath, 'schedule.json')
  }

  async _ensureFile() {
    if (!existsSync(this.configPath)) {
      await mkdir(this.configPath, { recursive: true })
    }
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, JSON.stringify({ schedule: [] }, null, 2))
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

  async findById(id) {
    const data = await this._read()
    const json = data.schedule.find(s => s.id === id)
    return json ? ScheduleRecord.fromJSON(json) : null
  }

  async findAll() {
    const data = await this._read()
    return data.schedule.map(s => ScheduleRecord.fromJSON(s))
  }

  async findByProject(project) {
    const records = await this.findAll()
    return records.filter(s => s.project === project)
  }

  async save(record) {
    const data = await this._read()
    const existingIndex = data.schedule.findIndex(s => s.id === record.id)

    if (existingIndex >= 0) {
      data.schedule[existingIndex] = record.toJSON()
    } else {
      data.schedule.unshift(record.toJSON())
    }

    await this._write(data)
    return record
  }

  async saveAll(records) {
    const data = await this._read()
    for (const record of records) {
      const existingIndex = data.schedule.findIndex(s => s.id === record.id)
      if (existingIndex >= 0) {
        data.schedule[existingIndex] = record.toJSON()
      } else {
        data.schedule.push(record.toJSON())
      }
    }
    await this._write(data)
    return records
  }

  async delete(id) {
    const data = await this._read()
    const initialLength = data.schedule.length
    data.schedule = data.schedule.filter(s => s.id !== id)
    await this._write(data)
    return data.schedule.length < initialLength
  }
}

export default FileSystemScheduleRecordRepository
