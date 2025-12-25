/**
 * Breadcrumb Entity - Context markers for "where was I?"
 * 
 * Breadcrumbs are lightweight markers that help reconstruct context:
 * - What was I thinking?
 * - Where did I get stuck?
 * - What was the next step?
 */

export class Breadcrumb {
  static TYPES = ['thought', 'stuck', 'next', 'decision', 'note'];

  constructor({
    id,
    text,
    type = 'note',
    project = null,
    session = null,
    file = null,
    line = null,
    timestamp = new Date()
  }) {
    this._validate(text, type);
    
    this.id = id || this._generateId();
    this.text = text.trim();
    this.type = type;
    this.project = project;
    this.session = session;
    this.file = file;
    this.line = line;
    this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
  }

  _validate(text, type) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Breadcrumb text cannot be empty');
    }
    if (text.length > 280) {
      throw new Error('Breadcrumb text cannot exceed 280 characters');
    }
    if (!Breadcrumb.TYPES.includes(type)) {
      throw new Error(`Invalid breadcrumb type: ${type}`);
    }
  }

  _generateId() {
    return `crumb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get age in human-readable format
   */
  getAge() {
    const ms = Date.now() - this.timestamp.getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Get icon for type
   */
  getIcon() {
    const icons = {
      thought: '💭',
      stuck: '🚧',
      next: '➡️',
      decision: '⚖️',
      note: '🍞'
    };
    return icons[this.type] || '🍞';
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      type: this.type,
      project: this.project,
      session: this.session,
      file: this.file,
      line: this.line,
      timestamp: this.timestamp.toISOString()
    };
  }

  /**
   * Create from stored data
   */
  static fromJSON(data) {
    return new Breadcrumb({
      ...data,
      timestamp: new Date(data.timestamp)
    });
  }
}

export default Breadcrumb;
