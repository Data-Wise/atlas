/**
 * Base class for session events
 * All events are immutable after construction
 */
export class SessionEvent {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.timestamp = new Date()
    // Note: Subclasses call Object.freeze(this) after setting their properties
    // Base class freezing would prevent subclass property assignment
  }
}

/**
 * Event: Session was started
 */
export class SessionStartedEvent extends SessionEvent {
  constructor(sessionId, project, task) {
    super(sessionId)
    this.project = project
    this.task = task
    Object.freeze(this)
  }
}

/**
 * Event: Session was ended
 */
export class SessionEndedEvent extends SessionEvent {
  constructor(sessionId, outcome, duration) {
    super(sessionId)
    this.outcome = outcome
    this.duration = duration
    Object.freeze(this)
  }
}

/**
 * Event: Session was paused
 */
export class SessionPausedEvent extends SessionEvent {
  constructor(sessionId) {
    super(sessionId)
    Object.freeze(this)
  }
}

/**
 * Event: Session was resumed
 */
export class SessionResumedEvent extends SessionEvent {
  constructor(sessionId) {
    super(sessionId)
    Object.freeze(this)
  }
}

/**
 * Event: Session context was updated
 */
export class SessionContextUpdatedEvent extends SessionEvent {
  constructor(sessionId, updates) {
    super(sessionId)
    this.updates = updates
    Object.freeze(this)
  }
}
