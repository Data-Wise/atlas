/**
 * FileSystem Capture Repository
 * Stores captures in ~/.atlas/captures.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Capture } from '../../domain/entities/Capture.js';

export class FileSystemCaptureRepository {
  constructor(configPath) {
    this.configPath = configPath || `${process.env.HOME}/.atlas`;
    this.filePath = path.join(this.configPath, 'captures.json');
  }

  async _ensureFile() {
    if (!existsSync(this.configPath)) {
      await mkdir(this.configPath, { recursive: true });
    }
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, JSON.stringify({ captures: [] }, null, 2));
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
   * Save a capture
   */
  async save(capture) {
    const data = await this._read();
    const existing = data.captures.findIndex(c => c.id === capture.id);
    
    if (existing >= 0) {
      data.captures[existing] = capture.toJSON();
    } else {
      data.captures.unshift(capture.toJSON()); // Most recent first
    }
    
    await this._write(data);
    return capture;
  }

  /**
   * Get all captures, optionally filtered
   */
  async findAll(filters = {}) {
    const data = await this._read();
    let captures = data.captures.map(c => Capture.fromJSON(c));
    
    if (filters.status) {
      captures = captures.filter(c => c.status === filters.status);
    }
    if (filters.project) {
      captures = captures.filter(c => c.project === filters.project);
    }
    if (filters.type) {
      captures = captures.filter(c => c.type === filters.type);
    }
    
    return captures;
  }

  /**
   * Get inbox (unprocessed captures)
   */
  async getInbox(filters = {}) {
    return this.findAll({ ...filters, status: 'inbox' });
  }

  /**
   * Find by ID
   */
  async findById(id) {
    const data = await this._read();
    const capture = data.captures.find(c => c.id === id);
    return capture ? Capture.fromJSON(capture) : null;
  }

  /**
   * Delete a capture
   */
  async delete(id) {
    const data = await this._read();
    data.captures = data.captures.filter(c => c.id !== id);
    await this._write(data);
  }

  /**
   * Get counts by status
   */
  async getCounts() {
    const data = await this._read();
    return {
      inbox: data.captures.filter(c => c.status === 'inbox').length,
      triaged: data.captures.filter(c => c.status === 'triaged').length,
      archived: data.captures.filter(c => c.status === 'archived').length,
      total: data.captures.length
    };
  }
}

export default FileSystemCaptureRepository;
