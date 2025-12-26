/**
 * Capture Entity - Quick capture for ideas, tasks, bugs
 * 
 * Captures are ephemeral items that flow into:
 * - Inbox (default, needs triage)
 * - Tasks (after triage, actionable)
 * - Archive (dismissed or completed)
 */

export class Capture {
  static TYPES = ['idea', 'task', 'bug', 'note', 'question', 'parked'];
  static STATUSES = ['inbox', 'triaged', 'archived', 'parked'];

  constructor({
    id,
    text,
    type = 'idea',
    status = 'inbox',
    project = null,
    tags = [],
    context = {},
    createdAt = new Date(),
    triagedAt = null
  }) {
    this._validate(text, type, status);
    
    this.id = id || this._generateId();
    this.text = text.trim();
    this.type = type;
    this.status = status;
    this.project = project;
    this.tags = [...tags];
    this.context = { ...context };
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.triagedAt = triagedAt ? (triagedAt instanceof Date ? triagedAt : new Date(triagedAt)) : null;
  }

  _validate(text, type, status) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Capture text cannot be empty');
    }
    if (text.length > 500) {
      throw new Error('Capture text cannot exceed 500 characters');
    }
    if (!Capture.TYPES.includes(type)) {
      throw new Error(`Invalid capture type: ${type}. Valid types: ${Capture.TYPES.join(', ')}`);
    }
    if (!Capture.STATUSES.includes(status)) {
      throw new Error(`Invalid capture status: ${status}`);
    }
  }

  _generateId() {
    return `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Triage this capture - move from inbox to triaged
   */
  triage(options = {}) {
    if (this.status !== 'inbox') {
      throw new Error('Can only triage inbox items');
    }
    this.status = 'triaged';
    this.triagedAt = new Date();
    if (options.project) this.project = options.project;
    if (options.type) this.type = options.type;
    if (options.tags) this.tags = [...options.tags];
    return this;
  }

  /**
   * Archive this capture
   */
  archive() {
    this.status = 'archived';
    return this;
  }

  /**
   * Associate with a project
   */
  assignToProject(project) {
    this.project = project;
    return this;
  }

  /**
   * Add context about where/when captured
   */
  addContext(key, value) {
    this.context[key] = value;
    return this;
  }

  /**
   * Add a tag
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this;
  }

  /**
   * Get age in human-readable format
   */
  getAge() {
    const ms = Date.now() - this.createdAt.getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      type: this.type,
      status: this.status,
      project: this.project,
      tags: this.tags,
      context: this.context,
      createdAt: this.createdAt.toISOString(),
      triagedAt: this.triagedAt?.toISOString() || null
    };
  }

  /**
   * Create from stored data
   */
  static fromJSON(data) {
    return new Capture({
      ...data,
      createdAt: new Date(data.createdAt),
      triagedAt: data.triagedAt ? new Date(data.triagedAt) : null
    });
  }
}

export default Capture;
