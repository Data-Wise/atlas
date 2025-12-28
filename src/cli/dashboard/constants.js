/**
 * Dashboard Constants
 *
 * Centralized configuration values for the dashboard TUI.
 */

// Layout constants
export const CARD_HEIGHT = 5
export const MIN_TERMINAL_WIDTH = 60
export const MIN_TERMINAL_HEIGHT = 15

// Virtual scrolling constants
export const VIRTUAL_SCROLL_BUFFER = 2 // Extra cards above/below viewport
export const CARD_POOL_SIZE = 20 // Maximum pooled card elements
export const RENDER_DEBOUNCE_MS = 16 // ~60fps

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

// Dialog dimensions
export const DIALOG_HELP = { width: 58, height: 28 }
export const DIALOG_SESSION_PROMPT = { width: 50, height: 3 }
export const DIALOG_BREAK_REMINDER = { width: 50, height: 12 }
export const DIALOG_DECISION_HELPER = { width: 60, height: 18 }
export const DIALOG_FOCUS_TIMER = { width: 50, height: 15 }

// Time of day boundaries (hours)
export const MORNING_START = 6
export const MORNING_END = 12
export const AFTERNOON_END = 17
export const EVENING_END = 21

// Problematic terminals that need workarounds
export const PROBLEM_TERMINALS = ['xterm-ghostty', 'ghostty']
export const FALLBACK_TERMINAL = 'xterm-256color'
