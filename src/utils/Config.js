/**
 * Config - Atlas configuration management
 *
 * Stores user preferences in ~/.atlas/config.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const DEFAULT_CONFIG = {
  scanPaths: [`${process.env.HOME}/projects`],
  storage: 'filesystem',
  scanDepth: 3
}

export class Config {
  constructor(configDir) {
    this.configDir = configDir || `${process.env.HOME}/.atlas`
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
        this._config = { ...DEFAULT_CONFIG, ...JSON.parse(data) }
      } else {
        this._config = { ...DEFAULT_CONFIG }
      }
    } catch {
      this._config = { ...DEFAULT_CONFIG }
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
}

export default Config
