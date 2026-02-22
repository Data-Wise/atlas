/**
 * Session Entity
 *
 * Represents a work session with identity and behavior.
 * Enforces business rules for session management.
 */

import { SessionState } from '../value-objects/SessionState.js'
import {
  SessionStartedEvent,
  SessionEndedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  SessionContextUpdatedEvent
} from '../events/SessionEvent.js'
import { BusinessRules } from '../constants/BusinessRules.js'

export class Session {
  /**
   * Create a new session
   * @param {string} id - Unique session identifier
   * @param {string} project - Project name
   * @param {Object} options - Optional configuration
   */
  constructor(id, project, options = {}) {
    // Required properties
    this.id = id
    this.project = project

    // Optional properties with defaults
    this.task = options.task || BusinessRules.SESSION_DEFAULT_TASK
    this.branch = options.branch || BusinessRules.SESSION_DEFAULT_BRANCH
    this.startTime = options.startTime || new Date()
    this.endTime = null
    this.pausedAt = null
    this.resumedAt = null
    this.totalPausedTime = 0
    this.state = new SessionState(SessionState.ACTIVE)
    this.outcome = null
    this.context = options.context || {}

    // ADHD-friendly: track energy level for task matching
    this.energyLevel = options.energyLevel || null // high, medium, low, or null

    // Time estimation tracking (ADHD-friendly: helps calibrate time perception)
    // Use explicit undefined check to properly validate 0 as invalid
    this.estimatedMinutes = options.estimatedMinutes !== undefined ? options.estimatedMinutes : null

    // Domain events (not persisted)
    this._events = []

    // Validate on creation
    this.validate()

    // Emit creation event
    if (!options._skipEvents) {
      this._events.push(new SessionStartedEvent(this.id, this.project, this.task))
    }
  }

  /**
   * Business Rule: Validate session data
   */
  validate() {
    if (!this.project || this.project.trim() === '') {
      throw new Error('Session must have a project name')
    }

    if (this.project.length > 100) {
      throw new Error('Project name too long (max 100 characters)')
    }

    if (this.task && this.task.length > 500) {
      throw new Error('Task description too long (max 500 characters)')
    }

    // Validate energy level if provided
    const validEnergyLevels = ['high', 'medium', 'low']
    if (this.energyLevel && !validEnergyLevels.includes(this.energyLevel)) {
      throw new Error(`Invalid energy level: ${this.energyLevel}. Must be one of: ${validEnergyLevels.join(', ')}`)
    }

    // Validate estimated minutes if provided
    if (this.estimatedMinutes !== null) {
      if (typeof this.estimatedMinutes !== 'number' || this.estimatedMinutes <= 0) {
        throw new Error('Estimated minutes must be a positive number')
      }
      if (this.estimatedMinutes > 480) { // 8 hours max
        throw new Error('Estimated minutes cannot exceed 480 (8 hours)')
      }
    }
  }

  /**
   * Business Rule: End active session
   * @param {string} outcome - Session outcome (completed, cancelled, interrupted)
   */
  end(outcome = 'completed') {
    const newState = new SessionState(SessionState.ENDED)
    if (!this.state.canTransitionTo(newState)) {
      throw new Error(`Cannot end session: invalid transition from '${this.state.value}' to 'ended'`)
    }

    if (!BusinessRules.SESSION_VALID_OUTCOMES.includes(outcome)) {
      throw new Error(`Invalid outcome: ${outcome}. Must be one of: ${BusinessRules.SESSION_VALID_OUTCOMES.join(', ')}`)
    }

    this.endTime = new Date()
    this.state = newState
    this.outcome = outcome

    this._events.push(new SessionEndedEvent(this.id, outcome, this.getDuration()))
  }

  /**
   * Business Rule: Pause active session
   */
  pause() {
    const newState = new SessionState(SessionState.PAUSED)
    if (!this.state.canTransitionTo(newState)) {
      throw new Error(`Cannot pause session: invalid transition from '${this.state.value}' to 'paused'`)
    }

    this.pausedAt = new Date()
    this.state = newState

    this._events.push(new SessionPausedEvent(this.id))
  }

  /**
   * Business Rule: Resume paused session
   */
  resume() {
    const newState = new SessionState(SessionState.ACTIVE)
    if (!this.state.canTransitionTo(newState)) {
      throw new Error(`Cannot resume session: invalid transition from '${this.state.value}' to 'active'`)
    }

    if (this.pausedAt) {
      const pauseDuration = new Date() - this.pausedAt
      this.totalPausedTime += pauseDuration
    }

    this.resumedAt = new Date()
    this.pausedAt = null
    this.state = newState

    this._events.push(new SessionResumedEvent(this.id))
  }

  /**
   * Get session duration in minutes (excluding paused time)
   * @returns {number} Duration in minutes
   */
  getDuration() {
    const end = this.endTime || new Date()
    let duration = end - this.startTime

    // Subtract total paused time
    duration -= this.totalPausedTime

    // If currently paused, subtract current pause duration
    if (this.state.isPaused() && this.pausedAt) {
      duration -= new Date() - this.pausedAt
    }

    return Math.max(0, Math.floor(duration / 60000)) // minutes
  }

  /**
   * Get active work duration (excluding pauses)
   * @returns {number} Active duration in minutes
   */
  getActiveDuration() {
    return this.getDuration()
  }

  /**
   * Business Rule: Session is in flow state after 15 minutes of active work
   * @returns {boolean}
   */
  isInFlowState() {
    return this.state.isActive() && this.getDuration() >= BusinessRules.SESSION_FLOW_STATE_MINUTES
  }

  /**
   * Update session context (metadata)
   * @param {Object} updates - Context updates
   */
  updateContext(updates) {
    this.context = { ...this.context, ...updates }
    this._events.push(new SessionContextUpdatedEvent(this.id, updates))
  }

  /**
   * Get pending domain events
   * @returns {Array} Domain events
   */
  getEvents() {
    return [...this._events]
  }

  /**
   * Clear events after publishing
   */
  clearEvents() {
    this._events = []
  }

  /**
   * Get session summary
   * @returns {Object} Session summary
   */
  getSummary() {
    return {
      id: this.id,
      project: this.project,
      task: this.task,
      duration: this.getDuration(),
      state: this.state.value,
      outcome: this.outcome,
      isFlowState: this.isInFlowState(),
      energyLevel: this.energyLevel,
      estimatedMinutes: this.estimatedMinutes,
      estimationAccuracy: this.getEstimationAccuracy()
    }
  }

  /**
   * Set energy level for the session
   * @param {string} level - Energy level (high, medium, low)
   */
  setEnergyLevel(level) {
    const validEnergyLevels = ['high', 'medium', 'low']
    if (!validEnergyLevels.includes(level)) {
      throw new Error(`Invalid energy level: ${level}. Must be one of: ${validEnergyLevels.join(', ')}`)
    }
    this.energyLevel = level
  }

  /**
   * Set estimated minutes for the session
   * @param {number} minutes - Estimated duration in minutes
   */
  setEstimatedMinutes(minutes) {
    if (typeof minutes !== 'number' || minutes <= 0) {
      throw new Error('Estimated minutes must be a positive number')
    }
    if (minutes > 480) {
      throw new Error('Estimated minutes cannot exceed 480 (8 hours)')
    }
    this.estimatedMinutes = minutes
  }

  /**
   * Get estimation accuracy (how well the estimate matched actual duration)
   * Only meaningful for ended sessions with estimates
   * @returns {Object|null} Accuracy info or null if not applicable
   */
  getEstimationAccuracy() {
    if (!this.estimatedMinutes || !this.state.isEnded()) {
      return null
    }

    const actual = this.getDuration()
    const estimated = this.estimatedMinutes
    const difference = actual - estimated
    const percentageOff = estimated > 0 ? Math.round((difference / estimated) * 100) : 0

    return {
      estimated,
      actual,
      difference, // positive = took longer (underestimated), negative = took less (overestimated)
      percentageOff, // positive = underestimated, negative = overestimated
      wasUnderestimate: difference > 0,
      wasOverestimate: difference < 0,
      wasAccurate: Math.abs(percentageOff) <= 10 // within 10% is considered accurate
    }
  }

  /**
   * Check if session has an estimate
   * @returns {boolean}
   */
  hasEstimate() {
    return this.estimatedMinutes !== null && this.estimatedMinutes > 0
  }
}
