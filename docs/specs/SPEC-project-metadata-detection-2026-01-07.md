# Specification: Polyglot Project Metadata Detection

**Status:** Draft
**Created:** 2026-01-07
**From Brainstorm:** [BRAINSTORM-project-metadata-collection-2026-01-07.md](../../BRAINSTORM-project-metadata-collection-2026-01-07.md)
**System Design:** [SYSTEM-DESIGN-project-metadata-detection-2026-01-07.md](../../SYSTEM-DESIGN-project-metadata-detection-2026-01-07.md)
**Version:** 1.0

---

## Overview

Implement auto-detection of project types from ecosystem files (package.json, pyproject.toml, DESCRIPTION, etc.) with optional `.atlas/config.json` for user-maintained metadata.

**Goal:** Eliminate manual .STATUS file creation while maintaining user control.

**Strategy:** Auto-detect → Augment → Override

---

## Primary User Story

**As a** developer using Atlas,
**I want** projects to be auto-detected from ecosystem files,
**So that** I don't need to manually create .STATUS files.

### Acceptance Criteria

1. ✅ `atlas sync` detects Node.js projects from package.json
2. ✅ `atlas sync` detects Python projects from pyproject.toml
3. ✅ `atlas sync` detects R packages from DESCRIPTION
4. ✅ `atlas sync` detects Quarto projects from _quarto.yml
5. ✅ Auto-detected data includes: name, type, description, version
6. ✅ Optional .atlas/config.json augments with status, progress, priority
7. ✅ JSON schema validates .atlas/config.json
8. ✅ Helpful error messages for invalid config
9. ✅ Legacy .STATUS files still work (fallback)

---

## Secondary User Stories

### Story 2: Migration from .STATUS

**As a** developer with existing .STATUS files,
**I want** a migration tool to convert to .atlas/config.json,
**So that** I can adopt the new system without manual work.

**Acceptance Criteria:**
- `atlas migrate` command available
- Dry-run mode shows migration plan
- .STATUS backed up to .STATUS.backup
- .atlas/config.json created with user fields
- Migration preserves all metadata

### Story 3: Schema Validation

**As a** developer creating .atlas/config.json,
**I want** clear validation errors when I make mistakes,
**So that** I can fix issues quickly.

**Acceptance Criteria:**
- Invalid JSON shows helpful error
- Schema violations list specific fields
- Error messages suggest fixes
- Documentation link provided

---

## Implementation Plan

### Phase 1: Core Detection System (Week 1-2)

**Files to create:**
```
src/adapters/detectors/
├── DetectorChain.js
├── ProjectDetector.js          # Interface
├── BaseProjectData.js          # Value object
├── PackageJsonDetector.js
├── PyProjectDetector.js
├── DescriptionDetector.js
├── QuartoDetector.js
└── StatusFileDetector.js       # Legacy fallback
```

**Implementation order:**

#### 1.1: ProjectDetector Interface

```javascript
// src/adapters/detectors/ProjectDetector.js

/**
 * Interface for project type detection
 */
export class ProjectDetector {
  /**
   * Priority for detector chain (higher = checked first)
   * @type {number}
   */
  get priority() {
    throw new Error('Must override priority getter');
  }

  /**
   * Check if this detector can handle the project
   * @param {string} projectPath - Absolute path to project root
   * @returns {boolean}
   */
  canDetect(projectPath) {
    throw new Error('Must implement canDetect()');
  }

  /**
   * Extract project metadata
   * @param {string} projectPath - Absolute path to project root
   * @returns {Promise<BaseProjectData>}
   */
  async detect(projectPath) {
    throw new Error('Must implement detect()');
  }
}
```

#### 1.2: BaseProjectData Value Object

```javascript
// src/adapters/detectors/BaseProjectData.js

export class BaseProjectData {
  constructor({
    name,
    type,
    path,
    description,
    version,
    repository,
    homepage,
    license,
    detectedBy,
    detectedAt,
    ecosystemFiles
  }) {
    this.name = name;
    this.type = type;
    this.path = path;
    this.description = description;
    this.version = version;
    this.repository = repository;
    this.homepage = homepage;
    this.license = license;
    this.detectedBy = detectedBy;
    this.detectedAt = detectedAt || new Date();
    this.ecosystemFiles = ecosystemFiles || [];
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      path: this.path,
      description: this.description,
      version: this.version,
      repository: this.repository,
      homepage: this.homepage,
      license: this.license,
      detectedBy: this.detectedBy,
      detectedAt: this.detectedAt,
      ecosystemFiles: this.ecosystemFiles
    };
  }
}
```

#### 1.3: PackageJsonDetector

```javascript
// src/adapters/detectors/PackageJsonDetector.js

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { ProjectDetector } from './ProjectDetector.js';
import { BaseProjectData } from './BaseProjectData.js';

export class PackageJsonDetector extends ProjectDetector {
  get priority() {
    return 100;
  }

  canDetect(projectPath) {
    return existsSync(join(projectPath, 'package.json'));
  }

  async detect(projectPath) {
    const pkgPath = join(projectPath, 'package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    return new BaseProjectData({
      name: pkg.name || basename(projectPath),
      type: this._inferType(pkg),
      path: projectPath,
      description: pkg.description,
      version: pkg.version,
      repository: this._extractRepoUrl(pkg.repository),
      homepage: pkg.homepage,
      license: pkg.license,
      detectedBy: 'PackageJsonDetector',
      ecosystemFiles: ['package.json']
    });
  }

  _inferType(pkg) {
    if (pkg.bin) return 'node-cli';
    if (pkg.main || pkg.exports) return 'node-package';
    if (pkg.scripts?.start) return 'node-app';
    return 'node-package';
  }

  _extractRepoUrl(repo) {
    if (!repo) return undefined;
    if (typeof repo === 'string') return repo;
    if (repo.url) return repo.url;
    return undefined;
  }
}
```

#### 1.4: DetectorChain

```javascript
// src/adapters/detectors/DetectorChain.js

import { PackageJsonDetector } from './PackageJsonDetector.js';
import { PyProjectDetector } from './PyProjectDetector.js';
import { DescriptionDetector } from './DescriptionDetector.js';
import { QuartoDetector } from './QuartoDetector.js';
import { StatusFileDetector } from './StatusFileDetector.js';

export class DetectorChain {
  constructor() {
    this.detectors = [
      new PackageJsonDetector(),
      new PyProjectDetector(),
      new DescriptionDetector(),
      new QuartoDetector(),
      new StatusFileDetector()
    ].sort((a, b) => b.priority - a.priority);

    this._cache = new Map();
    this._cacheTTL = 30_000; // 30 seconds
  }

  /**
   * Detect project type using first matching detector
   * @param {string} projectPath - Absolute path to project root
   * @returns {Promise<BaseProjectData>}
   */
  async detect(projectPath) {
    // Check cache
    const cached = this._cache.get(projectPath);
    if (cached && Date.now() - cached._cachedAt < this._cacheTTL) {
      return cached.data;
    }

    // Find matching detector
    const detector = this.detectors.find(d => d.canDetect(projectPath));

    if (!detector) {
      throw new DetectionError(
        `No detector found for project: ${projectPath}\n\n` +
        'Supported types:\n' +
        '  • Node.js (package.json)\n' +
        '  • Python (pyproject.toml)\n' +
        '  • R (DESCRIPTION)\n' +
        '  • Quarto (_quarto.yml)\n\n' +
        'To register manually:\n' +
        '  atlas project add . --type <type>'
      );
    }

    // Detect
    const data = await detector.detect(projectPath);

    // Cache
    this._cache.set(projectPath, {
      data,
      _cachedAt: Date.now()
    });

    return data;
  }

  /**
   * Clear cache for a specific project or all projects
   * @param {string} [projectPath] - Optional project path
   */
  clearCache(projectPath) {
    if (projectPath) {
      this._cache.delete(projectPath);
    } else {
      this._cache.clear();
    }
  }
}

export class DetectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DetectionError';
  }
}
```

#### 1.5: Unit Tests

```javascript
// test/unit/adapters/detectors/PackageJsonDetector.test.js

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PackageJsonDetector } from '../../../../src/adapters/detectors/PackageJsonDetector.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import os from 'os';

describe('PackageJsonDetector', () => {
  let detector;
  let testDir;

  beforeEach(async () => {
    detector = new PackageJsonDetector();
    testDir = join(os.tmpdir(), `test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('priority', () => {
    it('should have priority 100', () => {
      expect(detector.priority).toBe(100);
    });
  });

  describe('canDetect', () => {
    it('should return true when package.json exists', async () => {
      await writeFile(join(testDir, 'package.json'), '{}');
      expect(detector.canDetect(testDir)).toBe(true);
    });

    it('should return false when package.json missing', () => {
      expect(detector.canDetect(testDir)).toBe(false);
    });
  });

  describe('detect', () => {
    it('should detect Node.js CLI from bin field', async () => {
      const pkg = {
        name: 'my-cli',
        version: '1.0.0',
        description: 'A CLI tool',
        bin: { 'my-cli': './bin/cli.js' }
      };

      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await detector.detect(testDir);

      expect(result.name).toBe('my-cli');
      expect(result.type).toBe('node-cli');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('A CLI tool');
      expect(result.detectedBy).toBe('PackageJsonDetector');
      expect(result.ecosystemFiles).toEqual(['package.json']);
    });

    it('should detect Node.js package from main field', async () => {
      const pkg = {
        name: 'my-lib',
        main: './index.js'
      };

      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await detector.detect(testDir);

      expect(result.type).toBe('node-package');
    });

    it('should use directory name when name field missing', async () => {
      await writeFile(join(testDir, 'package.json'), '{}');

      const result = await detector.detect(testDir);

      expect(result.name).toBe(testDir.split('/').pop());
    });

    it('should extract repository URL', async () => {
      const pkg = {
        name: 'test',
        repository: {
          type: 'git',
          url: 'https://github.com/user/repo.git'
        }
      };

      await writeFile(join(testDir, 'package.json'), JSON.stringify(pkg));

      const result = await detector.detect(testDir);

      expect(result.repository).toBe('https://github.com/user/repo.git');
    });
  });
});
```

### Phase 2: .atlas/config.json Support (Week 3-4)

**Files to create:**
```
src/adapters/detectors/
├── AtlasConfig.js              # Value object
├── AtlasConfigLoader.js        # Load and validate
└── MergeStrategy.js            # Merge base + atlas

src/utils/
└── atlasConfigSchema.js        # JSON schema
```

#### 2.1: Atlas Config Schema

```javascript
// src/utils/atlasConfigSchema.js

export const ATLAS_CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Atlas Project Configuration',
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['active', 'paused', 'archived'],
      description: 'Current project state'
    },
    progress: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Completion percentage'
    },
    priority: {
      type: 'number',
      enum: [1, 2, 3],
      description: 'Priority level (1=highest)'
    },
    phase: {
      type: 'string',
      description: 'Current phase or milestone'
    },
    focus: {
      type: 'string',
      description: 'Current work focus'
    },
    next: {
      type: 'string',
      description: 'Next action item'
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Custom tags for filtering'
    },
    overrides: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' }
      },
      description: 'Override auto-detected values (use with caution)'
    }
  },
  additionalProperties: false
};
```

#### 2.2: AtlasConfigLoader

```javascript
// src/adapters/detectors/AtlasConfigLoader.js

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import { ATLAS_CONFIG_SCHEMA } from '../../utils/atlasConfigSchema.js';

export class AtlasConfigLoader {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.validator = this.ajv.compile(ATLAS_CONFIG_SCHEMA);
  }

  /**
   * Load and validate .atlas/config.json
   * @param {string} projectPath - Project root path
   * @returns {Promise<AtlasConfig|null>}
   */
  async load(projectPath) {
    const configPath = join(projectPath, '.atlas', 'config.json');

    if (!existsSync(configPath)) {
      return null;
    }

    let content;
    try {
      content = await readFile(configPath, 'utf-8');
    } catch (err) {
      throw new ConfigError(
        `Failed to read .atlas/config.json: ${err.message}`
      );
    }

    let config;
    try {
      config = JSON.parse(content);
    } catch (err) {
      throw new ConfigError(
        `Invalid JSON in .atlas/config.json:\n${err.message}\n\n` +
        'Expected format:\n' +
        '{\n' +
        '  "status": "active",\n' +
        '  "progress": 75,\n' +
        '  "priority": 1\n' +
        '}'
      );
    }

    const valid = this.validator(config);
    if (!valid) {
      const errors = this.validator.errors
        .map(e => `  ${e.instancePath || '/'} ${e.message}`)
        .join('\n');

      throw new ConfigError(
        `Invalid .atlas/config.json:\n\n${errors}\n\n` +
        'See: https://data-wise.github.io/atlas/config-schema/'
      );
    }

    return config;
  }
}

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}
```

#### 2.3: MergeStrategy

```javascript
// src/adapters/detectors/MergeStrategy.js

export class MergeStrategy {
  /**
   * Merge base project data with atlas config
   * @param {BaseProjectData} baseData - Auto-detected data
   * @param {AtlasConfig|null} atlasConfig - User-provided config
   * @returns {Object} Merged project data
   */
  merge(baseData, atlasConfig) {
    if (!atlasConfig) {
      return {
        ...baseData.toJSON(),
        status: 'active',
        progress: 0,
        priority: 3,
        tags: []
      };
    }

    const merged = {
      ...baseData.toJSON(),
      status: atlasConfig.status || 'active',
      progress: atlasConfig.progress ?? 0,
      priority: atlasConfig.priority || 3,
      phase: atlasConfig.phase,
      focus: atlasConfig.focus,
      next: atlasConfig.next,
      tags: atlasConfig.tags || []
    };

    // Apply overrides (if provided)
    if (atlasConfig.overrides) {
      merged.name = atlasConfig.overrides.name || merged.name;
      merged.type = atlasConfig.overrides.type || merged.type;
      merged.description = atlasConfig.overrides.description || merged.description;
    }

    return merged;
  }
}
```

#### 2.4: Update DetectorChain

```javascript
// src/adapters/detectors/DetectorChain.js (updated)

import { AtlasConfigLoader } from './AtlasConfigLoader.js';
import { MergeStrategy } from './MergeStrategy.js';

export class DetectorChain {
  constructor() {
    // ... existing detector setup
    this.atlasLoader = new AtlasConfigLoader();
    this.merger = new MergeStrategy();
  }

  async detect(projectPath) {
    // ... existing cache check

    // Find detector
    const detector = this.detectors.find(d => d.canDetect(projectPath));
    if (!detector) {
      throw new DetectionError(/* ... */);
    }

    // Get base data
    const baseData = await detector.detect(projectPath);

    // Load .atlas/config.json
    let atlasConfig = null;
    try {
      atlasConfig = await this.atlasLoader.load(projectPath);
    } catch (err) {
      if (err instanceof ConfigError) {
        // Log warning but continue with base data
        console.warn(`⚠ ${err.message}`);
        console.warn('Using auto-detected data only.');
      } else {
        throw err;
      }
    }

    // Merge
    const projectData = this.merger.merge(baseData, atlasConfig);

    // Cache
    this._cache.set(projectPath, {
      data: projectData,
      _cachedAt: Date.now()
    });

    return projectData;
  }
}
```

### Phase 3: Migration Tool (Week 5-6)

**Files to create:**
```
src/use-cases/migration/
├── MigrateFromStatus.js
└── StatusParser.js

src/cli/commands/
└── migrate.js
```

#### 3.1: StatusParser

```javascript
// src/use-cases/migration/StatusParser.js

export class StatusParser {
  /**
   * Parse .STATUS file to extract metadata
   * @param {string} content - .STATUS file content
   * @returns {Object} Parsed metadata
   */
  parse(content) {
    const result = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^##\s+([^:]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        result[key.trim()] = value.trim();
      }
    }

    return result;
  }
}
```

#### 3.2: MigrateFromStatus Use Case

```javascript
// src/use-cases/migration/MigrateFromStatus.js

import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { StatusParser } from './StatusParser.js';

export class MigrateFromStatus {
  constructor({ detectorChain }) {
    this.detectorChain = detectorChain;
    this.statusParser = new StatusParser();
  }

  /**
   * Migrate .STATUS to .atlas/config.json
   * @param {string} projectPath - Project root path
   * @param {boolean} dryRun - If true, don't write files
   * @returns {Promise<Object>} Migration result
   */
  async execute(projectPath, dryRun = false) {
    const statusPath = join(projectPath, '.STATUS');

    if (!existsSync(statusPath)) {
      throw new Error(`No .STATUS file found in ${projectPath}`);
    }

    // 1. Parse .STATUS
    const statusContent = await readFile(statusPath, 'utf-8');
    const statusData = this.statusParser.parse(statusContent);

    // 2. Auto-detect base data
    const baseData = await this.detectorChain.detect(projectPath);

    // 3. Create atlas config from .STATUS
    const atlasConfig = {
      status: statusData.Status?.toLowerCase(),
      progress: parseInt(statusData.Progress || '0'),
      priority: parseInt(statusData.Priority || '3'),
      phase: statusData.Phase,
      focus: statusData.Focus,
      next: statusData.Next
    };

    if (statusData.Tags) {
      atlasConfig.tags = statusData.Tags.split(',').map(t => t.trim());
    }

    // Remove undefined values
    Object.keys(atlasConfig).forEach(key => {
      if (atlasConfig[key] === undefined) {
        delete atlasConfig[key];
      }
    });

    const result = {
      projectPath,
      statusData,
      atlasConfig,
      baseData: baseData.toJSON()
    };

    if (dryRun) {
      return result;
    }

    // 4. Write .atlas/config.json
    const atlasDir = join(projectPath, '.atlas');
    await mkdir(atlasDir, { recursive: true });

    const configPath = join(atlasDir, 'config.json');
    await writeFile(
      configPath,
      JSON.stringify(atlasConfig, null, 2) + '\n'
    );

    // 5. Archive .STATUS
    const backupPath = join(projectPath, '.STATUS.backup');
    await rename(statusPath, backupPath);

    result.configPath = configPath;
    result.backupPath = backupPath;

    return result;
  }
}
```

#### 3.3: CLI Command

```javascript
// src/cli/commands/migrate.js

import chalk from 'chalk';

export function createMigrateCommand(program, getAtlas) {
  program
    .command('migrate')
    .description('Migrate from .STATUS to .atlas/config.json')
    .option('--all', 'Migrate all projects with .STATUS files')
    .option('--dry-run', 'Show migration plan without applying')
    .argument('[project]', 'Project name or path to migrate')
    .action(async (project, options) => {
      const atlas = getAtlas();
      const migrateUseCase = atlas.container.getMigrateFromStatus();

      try {
        let projectPaths = [];

        if (options.all) {
          // Find all projects with .STATUS
          const allProjects = await atlas.projectRepository.findAll();
          projectPaths = allProjects
            .filter(p => existsSync(join(p.path, '.STATUS')))
            .map(p => p.path);

          if (projectPaths.length === 0) {
            console.log(chalk.yellow('No projects with .STATUS files found'));
            return;
          }

          console.log(chalk.cyan(`Found ${projectPaths.length} projects to migrate\n`));
        } else if (project) {
          // Migrate specific project
          const proj = await atlas.projectRepository.findByName(project);
          if (!proj) {
            throw new Error(`Project not found: ${project}`);
          }
          projectPaths = [proj.path];
        } else {
          // Migrate current directory
          projectPaths = [process.cwd()];
        }

        for (const projectPath of projectPaths) {
          const result = await migrateUseCase.execute(projectPath, options.dryRun);

          if (options.dryRun) {
            console.log(chalk.cyan(`\n${projectPath}:`));
            console.log(chalk.white('  Base data (auto-detected):'));
            console.log(chalk.dim(`    Name: ${result.baseData.name}`));
            console.log(chalk.dim(`    Type: ${result.baseData.type}`));
            console.log(chalk.white('  Atlas config (from .STATUS):'));
            console.log(chalk.dim(JSON.stringify(result.atlasConfig, null, 4)));
          } else {
            console.log(chalk.green(`✓ Migrated ${result.baseData.name}`));
            console.log(chalk.dim(`  Created: .atlas/config.json`));
            console.log(chalk.dim(`  Archived: .STATUS → .STATUS.backup`));
          }
        }

        if (options.dryRun) {
          console.log(chalk.yellow('\nDry run - no files changed'));
          console.log(chalk.white('Run without --dry-run to apply migration'));
        }
      } catch (err) {
        console.error(chalk.red(`✗ Migration failed: ${err.message}`));
        process.exit(1);
      }
    });
}
```

### Phase 4: CLI Integration

#### 4.1: Update atlas sync

```javascript
// src/cli/commands/sync.js (updated)

export function createSyncCommand(program, getAtlas) {
  program
    .command('sync')
    .description('Sync project registry with auto-detection')
    .option('--from-status', 'Use .STATUS files (deprecated)')
    .option('--dry-run', 'Show what would be detected without saving')
    .option('--verbose', 'Show detailed detection info')
    .argument('[paths...]', 'Project paths to sync')
    .action(async (paths, options) => {
      const atlas = getAtlas();
      const detectorChain = atlas.container.getDetectorChain();

      const projectPaths = paths.length > 0
        ? paths
        : await findProjects(atlas.config.scanPaths);

      for (const projectPath of projectPaths) {
        try {
          const projectData = await detectorChain.detect(projectPath);

          if (options.dryRun) {
            console.log(chalk.cyan(`\n${projectPath}:`));
            console.log(formatProjectData(projectData));
            continue;
          }

          await atlas.projectRepository.save(projectData);
          console.log(chalk.green(`✓ ${projectData.name}`));

          if (options.verbose) {
            console.log(chalk.dim(`  Type: ${projectData.type}`));
            console.log(chalk.dim(`  Detected by: ${projectData.detectedBy}`));
            console.log(chalk.dim(`  Files: ${projectData.ecosystemFiles.join(', ')}`));
            if (projectData.overrides) {
              console.log(chalk.yellow('  ⚠ Overrides applied'));
            }
          }
        } catch (err) {
          console.error(chalk.red(`✗ ${projectPath}`));
          console.error(chalk.dim(`  ${err.message}`));
        }
      }
    });
}
```

---

## Testing Checklist

### Unit Tests
- [ ] PackageJsonDetector (all methods)
- [ ] PyProjectDetector (all methods)
- [ ] DescriptionDetector (all methods)
- [ ] QuartoDetector (all methods)
- [ ] StatusFileDetector (all methods)
- [ ] DetectorChain (caching, selection)
- [ ] AtlasConfigLoader (validation)
- [ ] MergeStrategy (all scenarios)
- [ ] StatusParser (edge cases)
- [ ] MigrateFromStatus use case

### Integration Tests
- [ ] End-to-end detection flow
- [ ] atlas sync with real projects
- [ ] atlas migrate command
- [ ] Error handling scenarios
- [ ] Cache behavior

### Manual Testing
- [ ] Create test projects (Node, Python, R, Quarto)
- [ ] Run atlas sync --dry-run
- [ ] Create .atlas/config.json manually
- [ ] Test invalid config validation
- [ ] Test migration from .STATUS

---

## Documentation Updates

### User-Facing
- [ ] Update CLI-REFERENCE.md (atlas sync, migrate)
- [ ] Create guides/project-detection.md
- [ ] Update TUTORIAL.md (remove .STATUS creation)
- [ ] Add config-schema documentation

### Developer
- [ ] Update ARCHITECTURE.md (detector system)
- [ ] Add docs/architecture/detector-system.md
- [ ] Update CONTRIBUTING.md (adding detectors)

---

## Migration Checklist

### Pre-Release (v0.9.0)
- [ ] All detectors implemented
- [ ] .atlas/config.json working
- [ ] Migration tool working
- [ ] Documentation complete
- [ ] Tests passing (>80% coverage)

### Release (v0.9.0)
- [ ] Add deprecation warning for .STATUS
- [ ] Announce migration tool
- [ ] Provide migration guide

### Post-Release (v0.10.0)
- [ ] Make .STATUS read-only
- [ ] Auto-prompt migration on detection
- [ ] Remove .STATUS support (v0.11.0)

---

## Open Questions

### Q1: Should we auto-migrate on first sync?

**Options:**
- **A)** Auto-migrate with confirmation prompt
- **B)** Require explicit `atlas migrate` command
- **C)** Auto-migrate in background, log location

**Recommendation:** B (explicit is better than implicit)

---

### Q2: How to handle projects with both .STATUS and .atlas/config.json?

**Options:**
- **A)** .atlas/config.json takes precedence, warn about .STATUS
- **B)** Merge both (error-prone)
- **C)** Fail with error message

**Recommendation:** A (clear precedence, helpful warning)

---

### Q3: Should .atlas/ be in default .gitignore templates?

**Recommendation:**
```gitignore
# .atlas/ structure
.atlas/captures/       # Personal captures
.atlas/sessions/       # Personal session history
# .atlas/config.json   # Commit this (shared project state)
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Auto-detection accuracy | >90% |
| Test coverage | >80% |
| Migration success rate | >95% |
| User errors (config) | <5/month |

---

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | Week 1-2 | Core detectors, tests |
| Phase 2 | Week 3-4 | .atlas/config.json, validation |
| Phase 3 | Week 5-6 | Migration tool, docs |
| Phase 4 | Week 7 | CLI integration, testing |

**Total:** ~7 weeks

---

**Status:** Ready for implementation
**Assigned to:** TBD
**Target Release:** v0.9.0
