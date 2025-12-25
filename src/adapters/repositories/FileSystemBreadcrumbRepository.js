/**
 * FileSystem Breadcrumb Repository
 * Stores breadcrumbs in ~/.atlas/breadcrumbs.json
 * 
 * Breadcrumbs are automatically pruned after 30 days
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Breadcrumb } from '../../domain/entities/Breadcrumb.js';

export class FileSystemBreadcrumbRepository {
  constructor(configPath, options = {}) {
    this.configPath = configPath || `${process.env.HOME}/.atlas`;
    this.filePath = path.join(this.configPath, 'breadcrumbs.json');
    this.retentionDays = options.retentionDays || 30;
  }

  async _ensureFile() {
    if (!existsSync(this.configPath)) {
      await mkdir(this.configPath, { recursive: true });
    }
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, JSON.stringify({ breadcrumbs: [] }, null, 2));
    }
  }

  async _read() {
    await this._ensureFile();
    const data = await readFile(this.filePath, 'utf-8');
    return JSON.parse(data);
  }

  async _write(data) {
    await this._ensureFile();
    await writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Prune old breadcrumbs
   */
  _prune(breadcrumbs) {
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    return breadcrumbs.filter(b => new Date(b.timestamp).getTime() > cutoff);
  }

  /**
   * Save a breadcrumb
   */
  async save(breadcrumb) {
    const data = await this._read();
    data.breadcrumbs.unshift(breadcrumb.toJSON()); // Most recent first
    data.breadcrumbs = this._prune(data.breadcrumbs);
    await this._write(data);
    return breadcrumb;
  }

  /**
   * Get recent breadcrumbs
   */
  async getRecent(options = {}) {
    const { limit = 20, project = null, days = 7 } = options;
    const data = await this._read();
    
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    let breadcrumbs = data.breadcrumbs
      .map(b => Breadcrumb.fromJSON(b))
      .filter(b => b.timestamp.getTime() > cutoff);
    
    if (project) {
      breadcrumbs = breadcrumbs.filter(b => b.project === project);
    }
    
    return breadcrumbs.slice(0, limit);
  }

  /**
   * Get trail for a specific project
   */
  async getTrail(project, options = {}) {
    const { days = 7 } = options;
    return this.getRecent({ project, days, limit: 50 });
  }

  /**
   * Get breadcrumbs for a session
   */
  async getForSession(sessionId) {
    const data = await this._read();
    return data.breadcrumbs
      .filter(b => b.session === sessionId)
      .map(b => Breadcrumb.fromJSON(b));
  }

  /**
   * Find by ID
   */
  async findById(id) {
    const data = await this._read();
    const crumb = data.breadcrumbs.find(b => b.id === id);
    return crumb ? Breadcrumb.fromJSON(crumb) : null;
  }

  /**
   * Delete a breadcrumb
   */
  async delete(id) {
    const data = await this._read();
    data.breadcrumbs = data.breadcrumbs.filter(b => b.id !== id);
    await this._write(data);
  }

  /**
   * Get count
   */
  async getCount(project = null) {
    const data = await this._read();
    if (project) {
      return data.breadcrumbs.filter(b => b.project === project).length;
    }
    return data.breadcrumbs.length;
  }

  /**
   * Find recent breadcrumbs (interface method for use cases)
   * @param {string} project - Project name to filter by (optional)
   * @param {number} limit - Maximum number to return
   * @returns {Promise<Breadcrumb[]>}
   */
  async findRecent(project, limit = 10) {
    return this.getRecent({ project, limit });
  }

  /**
   * Find breadcrumbs since a specific date
   * @param {string} since - ISO date string
   * @param {string} [project] - Optional project filter
   * @returns {Promise<Breadcrumb[]>}
   */
  async findSince(since, project = null) {
    const data = await this._read();
    const sinceDate = new Date(since);

    let breadcrumbs = data.breadcrumbs
      .map(b => Breadcrumb.fromJSON(b))
      .filter(b => b.timestamp >= sinceDate);

    if (project) {
      breadcrumbs = breadcrumbs.filter(b => b.project === project);
    }

    return breadcrumbs;
  }
}

export default FileSystemBreadcrumbRepository;
