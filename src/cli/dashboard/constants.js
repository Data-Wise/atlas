/**
 * Dashboard Constants
 *
 * Centralized configuration values for the dashboard TUI.
 */

// Layout constants
export const CARD_HEIGHT = 5
export const MIN_TERMINAL_WIDTH = 60
export const MIN_TERMINAL_HEIGHT = 15

// Timer constants (in milliseconds)
export const REFRESH_INTERVAL = 30000 // 30 seconds
export const TIMER_TICK_INTERVAL = 1000 // 1 second

// Pomodoro defaults (in minutes)
export const DEFAULT_POMODORO_MINUTES = 25
export const MIN_POMODORO_MINUTES = 5
export const MAX_POMODORO_MINUTES = 60
export const POMODORO_ADJUST_STEP = 5

// Cache TTL (in milliseconds)
export const PROJECT_CACHE_TTL = 30000 // 30 seconds
export const SCAN_CACHE_TTL = 3600000 // 1 hour

// UI limits
export const MAX_PROGRESS_BAR_WIDTH = 30
export const MAX_TRUNCATE_LENGTH = 50

// Time of day boundaries (hours)
export const MORNING_START = 6
export const MORNING_END = 12
export const AFTERNOON_END = 17
export const EVENING_END = 21

// Problematic terminals that need workarounds
export const PROBLEM_TERMINALS = ['xterm-ghostty', 'ghostty']
export const FALLBACK_TERMINAL = 'xterm-256color'
