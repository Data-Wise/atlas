# Project Setup Audit: Dev Tooling Ecosystem

This document audits the per-project and global setup patterns across the core developer tools to identify redundancies and standardization opportunities.

## Comparison Table

| Tool | Per-Project Setup | Global Data/Config | Purpose | Overlaps |
|------|-------------------|--------------------|----------|-----------|
| **atlas** | `.STATUS` | `~/.atlas/` (`projects.json`, `sessions.json`, `config.json`) | Project registry, state tracking, session history | `.STATUS` (all), `projects.json` (flow-cli legacy) |
| **craft** | `CLAUDE.md` | `.claude-plugin/plugin.json` (plugin root) | Context-aware AI plugin, worktree management | `CLAUDE.md` (obsidian, savant) |
| **flow-cli** | `.STATUS`, `.flow/` | `~/.config/flow-cli/` | Workflow automation, teaching configs | `.STATUS` (all), `.flow` (scholar) |
| **obsidian-cli-ops** | `.STATUS` | `~/.config/obs/vault_db.sqlite` | Vault graph analysis, AI note management | `.STATUS` (all) |
| **scholar** | `.STATUS`, `.flow/` | `mkdocs.yml` (repo root) | Teaching workflow plugin, content generation | `.STATUS` (all), `.flow` (flow-cli) |
| **savant** | `.STATUS`, `CLAUDE.md` | `package.json` (repo root) | Research-focused AI agent | `.STATUS` (all), `CLAUDE.md` (craft) |

## Summary Findings

### 1. The `.STATUS` Standard
Almost every tool uses a `.STATUS` file in the project root. This is the primary point of integration for `atlas` (registry sync) and `flow-cli`.

### 2. The `.flow` Pattern
`.flow` folders are used by `flow-cli` and `scholar` for tool-specific configurations (e.g., `teach-config.yml`). These are appearing in research/teaching projects, suggesting a common "project context" pattern.

### 3. Config Fragmentations
Global config is scattered across `~/.atlas/`, `~/.config/flow-cli/`, and `~/.config/obs/`.

### 4. Redundancies
- Multiple tools are reading and writing to `.STATUS`.
- Overlapping "Context" files (`CLAUDE.md` vs `.STATUS`).

## Recommended Direction for Standardization
- Consolidate per-project config into a unified folder (e.g., `.flow/` or `.atlas/`)
- Standardize the `.STATUS` format across all tools
- Move global registries to a single shared store (e.g., a single SQLite DB or shared JSON)
