# Brainstorm: Alternative Project Metadata Collection Strategies

**Date:** 2026-01-07
**Depth:** Deep Analysis
**Focus:** Feature Design
**Context:** Atlas currently uses `.STATUS` files (YAML-like) for project metadata
**Goal:** Explore better alternatives for collecting and storing project metadata

---

## Executive Summary

Atlas currently uses custom `.STATUS` files in YAML format at project roots. While functional, this approach has limitations:
- Custom format requires education
- No validation or schema
- Not standardized across ecosystems
- Doesn't leverage existing tools/conventions

This brainstorm explores **alternative metadata collection strategies** based on industry standards and existing patterns from popular tools.

---

## Current State: .STATUS Files

### What Atlas Uses Today

```yaml
## Project: atlas
## Type: node-package
## Status: active
## Phase: v0.9.0 Sprint 1
## Priority: 1
## Progress: 100
## Focus: Sprint 1 finished
## Next: Sprint 2
```

**Pros:**
- ✅ Simple, human-readable
- ✅ Git-friendly (plain text)
- ✅ Extensible (add any field)

**Cons:**
- ❌ Custom format (not standard)
- ❌ No schema validation
- ❌ Requires user to create/maintain
- ❌ Doesn't leverage existing metadata

---

## Research Findings

### Industry Standards

Based on research into modern project configuration practices, here are the key findings:

#### 1. XDG Base Directory Specification

The [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) defines standard locations for configuration files:

- **$XDG_CONFIG_HOME** - User-specific configs (`~/.config`)
- **$XDG_DATA_HOME** - User-specific data (`~/.local/share`)
- **$XDG_STATE_HOME** - User-specific state (`~/.local/state`)
- **$XDG_CACHE_HOME** - Non-essential data (`~/.cache`)

**Key insight:** Modern tools move configs to `~/.config/<appname>/` instead of polluting home directory with dotfiles.

Sources:
- [XDG Base Directory - ArchWiki](https://wiki.archlinux.org/title/XDG_Base_Directory)
- [XDG Base Directory Specification](https://xdgbasedirectoryspecification.com/)

---

#### 2. Language-Specific Metadata Files

Modern ecosystems have standardized project metadata:

| Language | File | Standard | Contents |
|----------|------|----------|----------|
| **Python** | `pyproject.toml` | [PEP 518](https://peps.python.org/pep-0518/) | Metadata, deps, tool configs |
| **JavaScript** | `package.json` | npm/Node.js | Metadata, scripts, deps |
| **Rust** | `Cargo.toml` | Cargo | Metadata, deps, build |
| **Quarto** | `_quarto.yml` | Quarto | Metadata, rendering |
| **R** | `DESCRIPTION` | CRAN | Package metadata |

**Key insight:** Projects already have rich metadata in ecosystem-native files.

Sources:
- [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [pyproject.toml specification](https://packaging.python.org/en/latest/specifications/pyproject-toml/)
- [Quarto Projects](https://quarto.org/docs/projects/quarto-projects.html)

---

#### 3. IDE/Editor Project Metadata

Popular IDEs store project metadata in hidden directories:

| IDE/Editor | Directory | Purpose | Format |
|------------|-----------|---------|--------|
| **VS Code** | `.vscode/` | Workspace settings, tasks, launch configs | JSON |
| **JetBrains** | `.idea/` | Project structure, SDKs, libraries | XML |
| **Emacs Projectile** | `.projectile` | Project root marker | Plain text |

**Key insight:** Tools already detect and use project-specific metadata.

Sources:
- [VS Code Workspace Settings](https://code.visualstudio.com/docs/configure/settings)
- [JetBrains .idea Directory](https://www.baeldung.com/intellij-idea-directory)
- [Projectile Configuration](https://docs.projectile.mx/projectile/configuration.html)

---

#### 4. Environment Management

Tools like `direnv` manage project-specific environment:

- **direnv** - `.envrc` file exports env vars when entering directory
- **Projectile-direnv** integration for Emacs
- Auto-loads project context on `cd`

**Key insight:** Context can be activated automatically based on directory.

Sources:
- [Managing Tool Dependencies with direnv](https://cuddly-octo-palm-tree.com/posts/2025-08-10-tool-dependencies/)
- [projectile-direnv](https://github.com/christianromney/projectile-direnv)

---

#### 5. Git Metadata Patterns

Git uses several metadata files:

- `.gitattributes` - File attributes (line endings, diffs, filters)
- `.gitmodules` - Submodule mapping
- `.gitignore` - Ignore patterns

**Key insight:** Multiple small, focused config files rather than one monolithic file.

Sources:
- [Git Submodules](https://git-scm.com/docs/gitsubmodules)
- [gitattributes Documentation](https://git-scm.com/docs/gitattributes)

---

## Proposed Solutions

### Proposal 1: Polyglot Detection + Augmentation (Recommended)

**Concept:** Auto-detect project type from existing files, augment with optional `.atlas/` directory.

**How it works:**

```
Step 1: Auto-detect project type
  - package.json → node, type: "app" | "package"
  - pyproject.toml → python
  - Cargo.toml → rust
  - DESCRIPTION → r-package
  - _quarto.yml → quarto
  - .STATUS → legacy format

Step 2: Extract metadata from native files
  - package.json: name, version, description, scripts, dependencies
  - pyproject.toml: [project] table with metadata
  - Cargo.toml: [package] section
  - DESCRIPTION: Package, Title, Description

Step 3: Augment with .atlas/ (optional)
  - .atlas/config.json - Atlas-specific metadata
    {
      "status": "active",
      "priority": 1,
      "progress": 80,
      "focus": "Current task",
      "next": "Next action"
    }
```

**File Structure:**

```
my-project/
├── package.json         # ← Auto-detected
├── .atlas/              # ← Atlas-specific (optional)
│   ├── config.json      # Project config
│   ├── sessions.json    # Local session cache
│   └── captures.json    # Local captures
├── .vscode/             # ← VS Code configs (ignored)
└── .git/                # ← Git metadata (used for branch)
```

**Pros:**
- ✅ Leverages existing ecosystem metadata
- ✅ No duplication (DRY principle)
- ✅ Works without any config for basic detection
- ✅ Optional augmentation for Atlas-specific data
- ✅ XDG-compliant pattern (`.atlas/` as subdirectory)

**Cons:**
- ⚠️ Requires parsers for multiple formats (JSON, TOML, YAML)
- ⚠️ Some metadata might be in different places per ecosystem

---

### Proposal 2: .config/atlas.json (XDG-Inspired)

**Concept:** Store Atlas metadata in `.config/atlas.json` at project root.

**How it works:**

```json
// .config/atlas.json
{
  "name": "atlas",
  "type": "node-package",
  "status": "active",
  "phase": "v0.9.0 Sprint 1",
  "priority": 1,
  "progress": 100,
  "focus": "Sprint 1 finished",
  "next": "Sprint 2",
  "metadata": {
    "totalSessions": 42,
    "totalDuration": 1250,
    "lastAccessed": "2026-01-07T12:00:00Z"
  }
}
```

**File Structure:**

```
my-project/
├── .config/
│   └── atlas.json       # All Atlas metadata
├── package.json         # Ecosystem metadata (separate)
└── .git/
```

**Pros:**
- ✅ Follows XDG pattern (reduce root clutter)
- ✅ JSON format (widely supported, validated)
- ✅ Single file (simple)

**Cons:**
- ⚠️ Creates `.config/` directory (may confuse users)
- ⚠️ Still requires manual metadata entry
- ⚠️ Doesn't leverage existing metadata

---

### Proposal 3: Extend Existing Ecosystem Files

**Concept:** Add `[tool.atlas]` section to existing config files.

**Examples:**

**Python (pyproject.toml):**
```toml
[project]
name = "my-package"
version = "1.0.0"

[tool.atlas]
status = "active"
priority = 1
progress = 80
focus = "Add new feature"
```

**JavaScript (package.json):**
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "atlas": {
    "status": "active",
    "priority": 1,
    "progress": 80,
    "focus": "Add new feature"
  }
}
```

**Pros:**
- ✅ No new files (uses existing config)
- ✅ Metadata colocated with project info
- ✅ Follows convention (like `[tool.poetry]` in pyproject.toml)

**Cons:**
- ⚠️ Pollutes ecosystem config files
- ⚠️ Doesn't work for projects without these files
- ⚠️ Requires different parsers per ecosystem

---

### Proposal 4: Hybrid .atlas.json + Auto-Detection

**Concept:** Optional `.atlas.json` at root, with auto-detection fallback.

**How it works:**

```
1. Check for .atlas.json (explicit config)
   → If found, use it as source of truth

2. Fallback to auto-detection
   → package.json → extract name, type
   → .git/config → extract remote URL
   → .git/HEAD → extract current branch

3. Merge with defaults
   → status: "unknown"
   → priority: 0
   → progress: 0
```

**File Structure:**

```
my-project/
├── .atlas.json          # Optional explicit config
├── package.json         # Ecosystem metadata (auto-detected)
└── .git/                # Git metadata (auto-detected)
```

**Example .atlas.json:**

```json
{
  "$schema": "https://atlas-cli.dev/schema/project.json",
  "status": "active",
  "priority": 1,
  "progress": 80,
  "focus": "Implement OAuth",
  "next": "Add tests",
  "tags": ["backend", "security"]
}
```

**Pros:**
- ✅ Works without config (auto-detect)
- ✅ Optional override for Atlas-specific data
- ✅ JSON schema validation possible
- ✅ Clean (single root file if needed)

**Cons:**
- ⚠️ Another root file (contributes to clutter)
- ⚠️ Requires schema definition and maintenance

---

## Comparison Matrix

| Aspect | Proposal 1<br/>Polyglot + .atlas/ | Proposal 2<br/>.config/atlas.json | Proposal 3<br/>Extend Ecosystem | Proposal 4<br/>.atlas.json |
|--------|----------|----------|------------|------------|
| **Reduces root clutter** | ✅ Yes (.atlas/ dir) | ✅ Yes (.config/) | ✅ Yes (no new files) | ❌ No (root file) |
| **Leverages existing metadata** | ✅✅ Yes | ❌ No | ⚠️ Partially | ⚠️ Partially |
| **Schema validation** | ✅ JSON schema | ✅ JSON schema | ⚠️ Per-ecosystem | ✅ JSON schema |
| **Works without config** | ✅✅ Yes | ❌ No | ❌ No | ✅ Yes (fallback) |
| **Cross-language support** | ✅✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Familiar pattern** | ✅ (.atlas/ like .vscode/) | ⚠️ (.config/ less common) | ✅ ([tool.*] pattern) | ✅ (root JSON file) |
| **Implementation complexity** | High (parsers) | Low | Medium | Medium |
| **Migration from .STATUS** | Easy (map fields) | Easy | Medium | Easy |

---

## Deep Dive: Proposal 1 (Polyglot Detection)

### Auto-Detection Logic

```typescript
// Project type detection
interface ProjectDetector {
  detect(projectPath: string): ProjectType;
}

class PolyglotDetector implements ProjectDetector {
  private detectors = [
    new PackageJsonDetector(),   // Node.js/npm
    new PyProjectDetector(),     // Python
    new CargoDetector(),         // Rust
    new DescriptionDetector(),   // R package
    new QuartoDetector(),        // Quarto
    new StatusFileDetector(),    // Legacy .STATUS
  ];

  detect(projectPath: string): ProjectType {
    for (const detector of this.detectors) {
      if (detector.canDetect(projectPath)) {
        return detector.detect(projectPath);
      }
    }
    return { type: 'unknown' };
  }
}
```

### Metadata Extraction Examples

**From package.json:**
```typescript
class PackageJsonDetector {
  extract(pkg: PackageJson): ProjectMetadata {
    return {
      name: pkg.name,
      description: pkg.description,
      type: pkg.type === 'module' ? 'node-package' : 'node-app',
      metadata: {
        version: pkg.version,
        scripts: Object.keys(pkg.scripts || {}),
        dependencies: Object.keys(pkg.dependencies || {}),
      }
    };
  }
}
```

**From pyproject.toml:**
```typescript
class PyProjectDetector {
  extract(pyproject: PyProjectToml): ProjectMetadata {
    const project = pyproject.project || {};
    return {
      name: project.name,
      description: project.description,
      type: 'python-package',
      metadata: {
        version: project.version,
        dependencies: project.dependencies || [],
      }
    };
  }
}
```

### .atlas/ Directory Structure

```
.atlas/
├── config.json          # Atlas-specific config
├── sessions.json        # Local session cache (optional)
├── captures.json        # Local captures (optional)
└── .gitignore           # Ignore session/capture cache
```

**config.json schema:**
```json
{
  "$schema": "https://atlas-cli.dev/schema/project-config.json",
  "status": "active",       // active | paused | archived
  "priority": 1,            // 0-5
  "progress": 80,           // 0-100
  "focus": "Current task",  // Free text
  "next": "Next action",    // Free text
  "tags": ["tag1", "tag2"], // Array of strings
  "estimatedDuration": 120, // Minutes
  "deadline": "2026-01-15"  // ISO date
}
```

---

## Quick Wins (< 30 min each)

### 1. ⚡ Add package.json Detection

**Task:** Detect Node.js projects by presence of `package.json`
**Benefit:** Auto-populate name, description, type
**Implementation:**
```typescript
if (fs.existsSync(join(projectPath, 'package.json'))) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  project.name = pkg.name;
  project.description = pkg.description;
  project.type = 'node-package';
}
```

---

### 2. ⚡ Add pyproject.toml Detection

**Task:** Detect Python projects by presence of `pyproject.toml`
**Benefit:** Auto-populate Python package metadata
**Implementation:**
```typescript
if (fs.existsSync(join(projectPath, 'pyproject.toml'))) {
  const pyproject = parseTOML(fs.readFileSync('pyproject.toml', 'utf8'));
  project.name = pyproject.project?.name;
  project.description = pyproject.project?.description;
  project.type = 'python-package';
}
```

---

### 3. ⚡ Support .atlas/config.json (Optional Override)

**Task:** Check for `.atlas/config.json` and merge with auto-detected data
**Benefit:** Users can override auto-detected values
**Implementation:**
```typescript
const atlasConfigPath = join(projectPath, '.atlas', 'config.json');
if (fs.existsSync(atlasConfigPath)) {
  const atlasConfig = JSON.parse(fs.readFileSync(atlasConfigPath, 'utf8'));
  project = { ...project, ...atlasConfig }; // Merge, atlas wins
}
```

---

### 4. ⚡ Add JSON Schema Validation

**Task:** Create JSON schema for `.atlas/config.json`
**Benefit:** VS Code auto-completion, validation
**Implementation:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Atlas Project Configuration",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["active", "paused", "archived"]
    },
    "priority": {
      "type": "integer",
      "minimum": 0,
      "maximum": 5
    },
    "progress": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100
    }
  }
}
```

---

## Medium Effort (1-2 hours)

### 1. 🔧 Implement Polyglot Detector System

**Task:** Build extensible detector system with priority chain
**Files:**
- `src/adapters/detectors/PolyglotDetector.ts` (new)
- `src/adapters/detectors/PackageJsonDetector.ts` (new)
- `src/adapters/detectors/PyProjectDetector.ts` (new)

**Implementation:**
- Chain of responsibility pattern
- Each detector checks if it can handle project
- First match wins
- Falls back to `.STATUS` if present

---

### 2. 🔧 Add TOML Parser for pyproject.toml

**Task:** Add TOML parsing support
**Library:** `@iarna/toml` or `smol-toml`
**Benefit:** Parse Python pyproject.toml files

---

### 3. 🔧 Create .atlas/ Directory Migration Tool

**Task:** Migrate existing `.STATUS` files to `.atlas/config.json`
**Command:** `atlas migrate --from-status`
**Implementation:**
```typescript
async function migrateFromStatus(projectPath: string) {
  const statusPath = join(projectPath, '.STATUS');
  const atlasDir = join(projectPath, '.atlas');

  if (fs.existsSync(statusPath)) {
    const statusData = parseStatusFile(statusPath);
    const atlasConfig = {
      status: statusData.status,
      priority: statusData.priority,
      progress: statusData.progress,
      focus: statusData.focus,
      next: statusData.next,
    };

    fs.mkdirSync(atlasDir, { recursive: true });
    fs.writeFileSync(
      join(atlasDir, 'config.json'),
      JSON.stringify(atlasConfig, null, 2)
    );

    console.log('✅ Migrated .STATUS → .atlas/config.json');
  }
}
```

---

### 4. 🔧 Add VS Code Extension for .atlas.json

**Task:** Provide schema validation and auto-completion in VS Code
**Files:**
- `.vscode/settings.json` - Map schema to .atlas/*.json
- `schema/atlas-config.schema.json` - JSON schema definition

---

## Long-term (Future sessions)

### 1. 🏗️ Smart Defaults from Git History

**Concept:** Infer project metadata from git history
**Examples:**
- **Last activity:** `git log -1 --format=%at` → lastAccessedAt
- **Contributors:** `git shortlog -sn` → team size
- **Commit frequency:** Analyze commit timestamps → activity level

---

### 2. 🏗️ Integration with GitHub/GitLab APIs

**Concept:** Fetch remote metadata via API
**Examples:**
- GitHub repo description → project description
- Issues → task list
- Stars/forks → popularity metrics
- Last push → last activity

---

### 3. 🏗️ Language Server Protocol (LSP) Integration

**Concept:** Provide project metadata via LSP
**Benefit:** IDEs can query Atlas for project info
**Use cases:**
- Show project status in status bar
- Suggest next actions in TODO comments
- Track time in editor

---

### 4. 🏗️ Multi-Language Workspace Support

**Concept:** Detect monorepos with multiple project types
**Examples:**
```
monorepo/
├── backend/         # Node.js (package.json)
├── frontend/        # Node.js (package.json)
├── ml-model/        # Python (pyproject.toml)
└── .atlas/
    └── workspace.json  # Workspace-level config
```

---

## Recommended Path

**Phase 1: Auto-Detection (Week 1)**
1. Implement `PackageJsonDetector`
2. Implement `PyProjectDetector`
3. Add fallback to `.STATUS` (backward compat)
4. Test with real projects

**Phase 2: .atlas/ Directory (Week 2)**
1. Add `.atlas/config.json` support
2. Create JSON schema
3. Implement merge logic (ecosystem + atlas)
4. Add migration tool

**Phase 3: Polish (Week 3)**
1. Add more detectors (Cargo.toml, DESCRIPTION, _quarto.yml)
2. Optimize performance (cache detections)
3. Add VS Code extension
4. Update docs

---

## Open Questions

### Q1: Should .atlas/ be in .gitignore by default?

**Options:**
- **A)** Yes - .atlas/ is local state only
- **B)** No - .atlas/config.json should be committed
- **C)** Hybrid - config.json committed, sessions.json ignored

**Recommendation:** Option C (hybrid)

---

### Q2: How to handle conflicts between ecosystem and .atlas/ data?

**Options:**
- **A)** Ecosystem wins (read-only from .atlas/)
- **B)** .atlas/ wins (can override)
- **C)** Explicit merge strategy

**Recommendation:** Option B (.atlas/ wins for flexibility)

---

### Q3: Should we support YAML in .atlas/config.yaml?

**Options:**
- **A)** JSON only (simplicity)
- **B)** JSON + YAML (flexibility)
- **C)** JSON + YAML + TOML (max compat)

**Recommendation:** Option A (JSON only, avoid parser sprawl)

---

## Success Metrics

| Metric | Before | After (Proposal 1) |
|--------|--------|---------------------|
| **Projects needing .STATUS** | 100% | 0% (auto-detect) |
| **Metadata duplication** | High (name in .STATUS + package.json) | None |
| **Supported project types** | Any (via .STATUS) | Node, Python, Rust, R, Quarto + more |
| **Setup friction** | Manual .STATUS creation | Zero (auto-detect) |
| **Override capability** | N/A | .atlas/config.json |

---

## Sources

- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/)
- [XDG Base Directory - ArchWiki](https://wiki.archlinux.org/title/XDG_Base_Directory)
- [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [pyproject.toml specification](https://packaging.python.org/en/latest/specifications/pyproject-toml/)
- [VS Code Workspace Settings](https://code.visualstudio.com/docs/configure/settings)
- [JetBrains .idea Directory](https://www.baeldung.com/intellij-idea-directory)
- [Projectile Configuration](https://docs.projectile.mx/projectile/configuration.html)
- [Managing Tool Dependencies with direnv](https://cuddly-octo-palm-tree.com/posts/2025-08-10-tool-dependencies/)
- [Git Submodules](https://git-scm.com/docs/gitsubmodules)
- [Quarto Projects](https://quarto.org/docs/projects/quarto-projects.html)

---

**Generated:** 2026-01-07
**Status:** Ready for discussion
**Recommended Proposal:** Proposal 1 (Polyglot Detection + .atlas/)
**Next Steps:** Review proposals, prototype detector, test with real projects
