/**
 * Business Rules Constants
 *
 * Centralized constants for domain validation rules.
 * Extracted to avoid magic numbers and ensure consistency across entities.
 */

export const BusinessRules = {
  // Text length limits
  PROJECT_NAME_MAX_LENGTH: 100,
  PROJECT_DESCRIPTION_MAX_LENGTH: 500,
  TASK_DESCRIPTION_MAX_LENGTH: 500,
  CAPTURE_TEXT_MAX_LENGTH: 500,
  BREADCRUMB_TEXT_MAX_LENGTH: 280,

  // Session defaults
  SESSION_DEFAULT_TASK: 'Work session',
  SESSION_DEFAULT_BRANCH: 'main',
  SESSION_FLOW_STATE_MINUTES: 15,

  // Valid outcomes for session end
  SESSION_VALID_OUTCOMES: ['completed', 'cancelled', 'interrupted'],

  // Capture types and statuses
  CAPTURE_TYPES: ['idea', 'task', 'bug', 'note', 'question', 'parked'],
  CAPTURE_STATUSES: ['inbox', 'triaged', 'archived', 'parked'],

  // Breadcrumb types
  BREADCRUMB_TYPES: ['thought', 'stuck', 'next', 'decision', 'note'],

  // Task priority levels
  TASK_PRIORITIES: ['low', 'medium', 'high', 'urgent']
}

// Freeze to prevent modification
Object.freeze(BusinessRules)
Object.freeze(BusinessRules.SESSION_VALID_OUTCOMES)
Object.freeze(BusinessRules.CAPTURE_TYPES)
Object.freeze(BusinessRules.CAPTURE_STATUSES)
Object.freeze(BusinessRules.BREADCRUMB_TYPES)
Object.freeze(BusinessRules.TASK_PRIORITIES)

export default BusinessRules
