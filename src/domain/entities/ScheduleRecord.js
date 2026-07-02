/**
 * ScheduleRecord Entity
 *
 * Represents a scheduled event/deadline received from external sources (e.g., status files or teach-config).
 * Pinned by ATLAS-CONTRACT.md v1.2.0.
 */
export class ScheduleRecord {
  static TYPES = ['teaching', 'research', 'general', 'recurring', 'holiday']
  static SOURCES = ['status', 'teach-config']

  constructor({
    id,
    date,
    label,
    type = 'general',
    project = null,
    recurrence = 'none',
    source = 'status'
  }) {
    this._validate(date, label, type, source)

    this.id = id || this._generateId()
    this.date = date // YYYY-MM-DD format string
    this.label = label.trim()
    this.type = type
    this.project = project
    this.recurrence = recurrence || 'none'
    this.source = source
  }

  _validate(date, label, type, source) {
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('ScheduleRecord date must be in YYYY-MM-DD format')
    }
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      throw new Error('ScheduleRecord label cannot be empty')
    }
    if (label.length > 500) {
      throw new Error('ScheduleRecord label cannot exceed 500 characters')
    }
    if (!ScheduleRecord.TYPES.includes(type)) {
      throw new Error(`Invalid ScheduleRecord type: ${type}. Valid types: ${ScheduleRecord.TYPES.join(', ')}`)
    }
    if (!ScheduleRecord.SOURCES.includes(source)) {
      throw new Error(`Invalid ScheduleRecord source: ${source}. Valid sources: ${ScheduleRecord.SOURCES.join(', ')}`)
    }
  }

  _generateId() {
    return `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Serializes the record to the contract read-direction shape.
   * Format: {"date":"YYYY-MM-DD","label":"text","type":"category","project":"name","recurrence":"none"}
   */
  toAgendaItem() {
    return {
      date: this.date,
      label: this.label,
      type: this.type,
      project: this.project || '',
      recurrence: this.recurrence
    }
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      date: this.date,
      label: this.label,
      type: this.type,
      project: this.project,
      recurrence: this.recurrence,
      source: this.source
    }
  }

  /**
   * Deserialize from JSON
   * @param {Object} json
   * @returns {ScheduleRecord}
   */
  static fromJSON(json) {
    if (!json) return null
    return new ScheduleRecord(json)
  }
}
