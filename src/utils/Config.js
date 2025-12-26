/**
 * Config - Atlas configuration management
 *
 * Stores user preferences in ~/.atlas/config.json
 *
 * Configuration Schema:
 * - scanPaths: directories to scan for projects
 * - storage: 'filesystem' or 'sqlite'
 * - preferences: user preferences (theme, ADHD settings, etc.)
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const DEFAULT_CONFIG = {
  scanPaths: [`${process.env.HOME}/projects`],
  storage: 'filesystem',
  scanDepth: 3,
  preferences: {
    // Display preferences
    theme: 'default',           // default, minimal, colorful
    showEmoji: true,            // show emojis in output
    compactMode: false,         // compact display mode

    // ADHD-friendly settings
    adhd: {
      showStreak: true,           // show streak in dashboard/CLI
      showTimeCues: true,         // gentle time awareness reminders
      showCelebrations: true,     // positive reinforcement
      showContextRestore: true,   // "last time you were..." messages
      flowThresholdMinutes: 15,   // minutes before flow state
      timeBlindnessInterval: 30,  // minutes between time cues
      celebrationLevel: 'normal'  // minimal, normal, enthusiastic
    },

    // Session defaults
    session: {
      defaultDurationMinutes: null,  // null = no default
      autoEndAfterMinutes: null,     // null = no auto-end
      pomodoroLength: 25,            // pomodoro work period
      breakLength: 5                 // pomodoro break period
    },

    // Dashboard settings
    dashboard: {
      refreshInterval: 1000,      // ms between updates
      showProjectCards: true,     // show project cards
      maxRecentProjects: 5,       // projects in recent list
      zenMode: false              // minimal distraction mode
    }
  }
}

/**
 * Deep merge objects (handles nested preferences)
 */
function deepMerge(target, source) {
  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export class Config {
  constructor(configDir) {
    this.configDir = configDir || process.env.ATLAS_CONFIG || `${process.env.HOME}/.atlas`
    this.configPath = join(this.configDir, 'config.json')
    this._config = null
  }

  /**
   * Load config from disk (or return defaults)
   */
  async load() {
    if (this._config) return this._config

    try {
      if (existsSync(this.configPath)) {
        const data = await readFile(this.configPath, 'utf-8')
        this._config = deepMerge(DEFAULT_CONFIG, JSON.parse(data))
      } else {
        this._config = deepMerge({}, DEFAULT_CONFIG)
      }
    } catch {
      this._config = deepMerge({}, DEFAULT_CONFIG)
    }

    return this._config
  }

  /**
   * Save config to disk
   */
  async save(config) {
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true })
    }

    this._config = { ...this._config, ...config }
    await writeFile(this.configPath, JSON.stringify(this._config, null, 2))
    return this._config
  }

  /**
   * Get a config value
   */
  async get(key) {
    const config = await this.load()
    return config[key]
  }

  /**
   * Set a config value
   */
  async set(key, value) {
    await this.load()
    this._config[key] = value
    await this.save(this._config)
    return this._config
  }

  /**
   * Add a scan path
   */
  async addScanPath(path) {
    await this.load()
    const paths = this._config.scanPaths || []
    if (!paths.includes(path)) {
      paths.push(path)
      await this.set('scanPaths', paths)
    }
    return paths
  }

  /**
   * Remove a scan path
   */
  async removeScanPath(path) {
    await this.load()
    const paths = (this._config.scanPaths || []).filter(p => p !== path)
    await this.set('scanPaths', paths)
    return paths
  }

  /**
   * Get all scan paths
   */
  async getScanPaths() {
    return await this.get('scanPaths') || DEFAULT_CONFIG.scanPaths
  }

  // ============================================================================
  // PREFERENCES HELPERS
  // ============================================================================

  /**
   * Get a preference using dot notation
   * e.g., getPreference('adhd.showStreak')
   */
  async getPreference(path) {
    const config = await this.load()
    const prefs = config.preferences || {}
    return path.split('.').reduce((obj, key) => obj?.[key], prefs)
  }

  /**
   * Set a preference using dot notation
   * e.g., setPreference('adhd.showStreak', false)
   */
  async setPreference(path, value) {
    await this.load()
    const keys = path.split('.')
    const lastKey = keys.pop()
    let target = this._config.preferences = this._config.preferences || {}

    for (const key of keys) {
      target[key] = target[key] || {}
      target = target[key]
    }
    target[lastKey] = value

    await this.save(this._config)
    return value
  }

  /**
   * Get all preferences
   */
  async getPreferences() {
    const config = await this.load()
    return config.preferences || DEFAULT_CONFIG.preferences
  }

  /**
   * Get ADHD-specific preferences
   */
  async getADHDPreferences() {
    return await this.getPreference('adhd') || DEFAULT_CONFIG.preferences.adhd
  }

  /**
   * Get session preferences
   */
  async getSessionPreferences() {
    return await this.getPreference('session') || DEFAULT_CONFIG.preferences.session
  }

  /**
   * Get dashboard preferences
   */
  async getDashboardPreferences() {
    return await this.getPreference('dashboard') || DEFAULT_CONFIG.preferences.dashboard
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences() {
    await this.set('preferences', DEFAULT_CONFIG.preferences)
    return DEFAULT_CONFIG.preferences
  }

  /**
   * Export config as formatted JSON (for display)
   */
  async export() {
    const config = await this.load()
    return JSON.stringify(config, null, 2)
  }

  /**
   * Get default config (for reference)
   */
  static getDefaults() {
    return deepMerge({}, DEFAULT_CONFIG)
  }
}

export default Config
