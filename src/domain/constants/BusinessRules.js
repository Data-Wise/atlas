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
  TASK_PRIORITIES: ['low', 'medium', 'high', 'urgent'],

  // Focus score weights (must sum to 1.0)
  FOCUS_SCORE_WEIGHT_DURATION: 0.30,
  FOCUS_SCORE_WEIGHT_FLOW: 0.30,
  FOCUS_SCORE_WEIGHT_COMPLETION: 0.25,
  FOCUS_SCORE_WEIGHT_CONSISTENCY: 0.15,

  // Duration scoring thresholds (minutes → points out of 100)
  FOCUS_SCORE_DURATION_EXCELLENT: 45,
  FOCUS_SCORE_DURATION_GOOD: 25,
  FOCUS_SCORE_DURATION_FAIR: 15,

  // Focus tier thresholds
  FOCUS_TIER_DEEP: 80,
  FOCUS_TIER_STRONG: 60,
  FOCUS_TIER_STEADY: 40,
  FOCUS_TIER_WARMING: 20,
}

// Freeze to prevent modification
Object.freeze(BusinessRules)
Object.freeze(BusinessRules.SESSION_VALID_OUTCOMES)
Object.freeze(BusinessRules.CAPTURE_TYPES)
Object.freeze(BusinessRules.CAPTURE_STATUSES)
Object.freeze(BusinessRules.BREADCRUMB_TYPES)
Object.freeze(BusinessRules.TASK_PRIORITIES)

export default BusinessRules
