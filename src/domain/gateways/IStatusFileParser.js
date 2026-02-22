/**
 * Interface for parsing .STATUS files from the filesystem.
 * Implementations should be in the adapters/gateways layer.
 */
export class IStatusFileParser {
  /**
   * Parse a single .STATUS file
   * @param {string} filePath - Path to the .STATUS file
   * @returns {Promise<Object|null>} Parsed status data or null if not found
   */
  async parse(filePath) { throw new Error('Not implemented') }

  /**
   * Scan a directory tree for all .STATUS files
   * @param {string} rootPath - Root directory to scan
   * @param {Object} [options] - Scan options
   * @param {number} [options.maxDepth] - Maximum directory depth (default: 3)
   * @param {string[]} [options.exclude] - Directory names to exclude
   * @returns {Promise<Array<{path: string, file: string, parsed: Object}>>} Array of parsed status objects
   */
  async scanDirectory(rootPath, options) { throw new Error('Not implemented') }

  /**
   * Get summary of all projects from scan results
   * @param {Array} scanResults - Results from scanDirectory()
   * @returns {Object} Summary with counts grouped by status, priority, and progress
   */
  summarize(scanResults) { throw new Error('Not implemented') }
}
