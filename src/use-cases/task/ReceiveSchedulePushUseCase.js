/**
 * ReceiveSchedulePushUseCase
 * Receives schedule items from external sources and upserts them.
 * Keyed by (project, date, label) to prevent duplicate entries.
 */
import { ScheduleRecord } from '../../domain/entities/ScheduleRecord.js'

export class ReceiveSchedulePushUseCase {
  constructor({ scheduleRecordRepository, eventPublisher }) {
    this.scheduleRecordRepository = scheduleRecordRepository
    this.eventPublisher = eventPublisher
  }

  /**
   * Execute the use case
   * @param {Object} params
   * @param {Array|string} params.data - Array of schedule objects or a JSON string representation
   * @returns {Promise<ScheduleRecord[]>} Upserted schedule records
   */
  async execute({ data }) {
    let recordsList = data

    if (typeof data === 'string') {
      try {
        recordsList = JSON.parse(data)
      } catch (error) {
        throw new Error(`Malformed JSON payload: ${error.message}`)
      }
    }

    if (!Array.isArray(recordsList)) {
      throw new Error('Push data must be an array of schedule records')
    }

    const existingRecords = await this.scheduleRecordRepository.findAll()
    const upsertedRecords = []

    for (const item of recordsList) {
      if (!item.date || !item.label) {
        throw new Error('Each pushed schedule item must contain a "date" and a "label"')
      }

      // Check for match keyed on (project, date, label)
      const normalizedProj = item.project || null
      const existing = existingRecords.find(
        r => r.project === normalizedProj &&
             r.date === item.date &&
             r.label.trim() === item.label.trim()
      )

      let record
      if (existing) {
        // Update properties keeping the original ID
        record = new ScheduleRecord({
          id: existing.id,
          date: existing.date,
          label: existing.label,
          type: item.type || existing.type,
          project: existing.project,
          recurrence: item.recurrence || existing.recurrence,
          source: item.source || existing.source
        })
      } else {
        // Create new
        record = new ScheduleRecord({
          date: item.date,
          label: item.label,
          type: item.type || 'general',
          project: normalizedProj,
          recurrence: item.recurrence || 'none',
          source: item.source || 'status'
        })
      }

      upsertedRecords.push(record)
    }

    await this.scheduleRecordRepository.saveAll(upsertedRecords)

    if (this.eventPublisher) {
      this.eventPublisher.publish({
        type: 'SchedulePushed',
        payload: upsertedRecords.map(r => r.toJSON()),
        timestamp: new Date().toISOString()
      })
    }

    return upsertedRecords
  }
}

export default ReceiveSchedulePushUseCase
