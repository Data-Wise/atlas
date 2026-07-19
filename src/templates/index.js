/**
 * Project Templates for Atlas
 *
 * Templates provide .STATUS file scaffolding for different project types
 * Supports custom user templates from ~/.atlas/templates/
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const USER_TEMPLATES_DIR = join(homedir(), '.atlas', 'templates');

const BUILTIN_TEMPLATES = {
  node: {
    name: 'Node.js Package',
    description: 'Node.js/npm package with standard structure',
    status: `---
schema: atlas/v1
status: active
progress: 0
type: node
priority: medium
focus: Set up project structure
next:
  - Initialize npm package
  - Set up testing framework
  - Create initial module structure
  - Add README documentation
---

# {{name}}

{{name}} is a Node.js package, maintained by {{user}}.

## Architecture
\`\`\`
{{name}}/
├── src/           # Source code
├── test/          # Tests
├── package.json   # Package manifest
└── README.md      # Documentation
\`\`\`

## Links
- npm: https://npmjs.com/package/{{name}}
- GitHub: https://github.com/{{user}}/{{name}}
`
  },

  'r-package': {
    name: 'R Package',
    description: 'R package with roxygen2 and testthat',
    status: `---
schema: atlas/v1
status: active
progress: 0
type: r-package
priority: medium
focus: Set up R package structure
next:
  - Create DESCRIPTION file
  - Set up roxygen2 documentation
  - Configure testthat for testing
  - Add package dependencies
---

# {{name}}

{{name}} is an R package, maintained by {{user}}.

## Architecture
\`\`\`
{{name}}/
├── R/             # R source files
├── man/           # Documentation (generated)
├── tests/         # testthat tests
├── DESCRIPTION    # Package metadata
├── NAMESPACE      # Exports (generated)
└── README.md      # Documentation
\`\`\`

## Links
- CRAN: https://cran.r-project.org/package={{name}}
- GitHub: https://github.com/{{user}}/{{name}}
`
  },

  python: {
    name: 'Python Package',
    description: 'Python package with pytest and pyproject.toml',
    status: `---
schema: atlas/v1
status: active
progress: 0
type: python
priority: medium
focus: Set up Python package structure
next:
  - Create pyproject.toml
  - Set up pytest
  - Create package structure
  - Add type hints
---

# {{name}}

{{name}} is a Python package, maintained by {{user}}.

## Architecture
\`\`\`
{{name}}/
├── src/{{name}}/  # Source code
├── tests/         # pytest tests
├── pyproject.toml # Package config
└── README.md      # Documentation
\`\`\`

## Links
- PyPI: https://pypi.org/project/{{name}}
- GitHub: https://github.com/{{user}}/{{name}}
`
  },

  quarto: {
    name: 'Quarto Document',
    description: 'Quarto manuscript or presentation',
    status: `---
schema: atlas/v1
status: active
progress: 0
type: quarto
priority: medium
focus: Draft initial content
next:
  - Create _quarto.yml configuration
  - Set up bibliography
  - Draft outline
  - Add initial content
---

# {{name}}

{{name}} is a Quarto document (manuscript/presentation), maintained by {{user}}.

## Architecture
\`\`\`
{{name}}/
├── index.qmd      # Main document
├── _quarto.yml    # Quarto config
├── references.bib # Bibliography
└── figures/       # Figures and images
\`\`\`

## Links
- Quarto: https://quarto.org
`
  },

  research: {
    name: 'Research Project',
    description: 'Academic research with manuscript and analysis',
    status: `---
schema: atlas/v1
status: planning
progress: 0
type: research
kind: manuscript
priority: medium
focus: Define research questions
next:
  - Literature review
  - Define hypotheses
  - Plan data collection
  - Set up analysis pipeline
target:
---

# {{name}}

{{name}} is a research project, maintained by {{user}}.

## Architecture
\`\`\`
{{name}}/
├── manuscript/    # Paper drafts
├── analysis/      # R/Python analysis scripts
├── data/          # Raw and processed data
├── figures/       # Generated figures
└── references/    # Bibliography
\`\`\`

## Research Questions
1.
`
  },

  minimal: {
    name: 'Minimal',
    description: 'Bare minimum .STATUS file',
    status: `---
schema: atlas/v1
status: active
progress: 0
focus: Getting started
next:
  - Define project goals
  - Set up structure
---

# {{name}}
`
  }
};

/**
 * Load user templates from ~/.atlas/templates/
 * Each template is a .md file with YAML frontmatter
 */
function loadUserTemplates() {
  const userTemplates = {};

  if (!existsSync(USER_TEMPLATES_DIR)) {
    return userTemplates;
  }

  try {
    const files = readdirSync(USER_TEMPLATES_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const id = file.replace('.md', '');
      const content = readFileSync(join(USER_TEMPLATES_DIR, file), 'utf-8');

      // Parse YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        let status = frontmatterMatch[2].trim();

        // Simple YAML parsing for name, description, extends
        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
        const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
        const extendsMatch = frontmatter.match(/^extends:\s*(.+)$/m);

        // Handle template inheritance
        if (extendsMatch) {
          const parentId = extendsMatch[1].trim();
          const parentTemplate = BUILTIN_TEMPLATES[parentId];
          if (parentTemplate) {
            // Merge: start with parent, apply child overrides
            // Child content can use {{parent}} to include parent content
            if (status.includes('{{parent}}')) {
              status = status.replace('{{parent}}', parentTemplate.status);
            } else if (status.trim() === '') {
              // Empty child = use parent as-is
              status = parentTemplate.status;
            }
            // Otherwise child completely overrides parent
          }
        }

        userTemplates[id] = {
          name: nameMatch ? nameMatch[1].trim() : id,
          description: descMatch ? descMatch[1].trim() : 'Custom template',
          extends: extendsMatch ? extendsMatch[1].trim() : null,
          status,
          isCustom: true
        };
      } else {
        // No frontmatter, use file content as template
        userTemplates[id] = {
          name: id,
          description: 'Custom template',
          status: content.trim(),
          isCustom: true
        };
      }
    }
  } catch (err) {
    // Silently fail on errors
  }

  return userTemplates;
}

/**
 * Get all templates (builtin + user, user overrides builtin)
 */
function getAllTemplates() {
  const userTemplates = loadUserTemplates();
  return { ...BUILTIN_TEMPLATES, ...userTemplates };
}

/**
 * Get list of available templates
 */
export function listTemplates() {
  const templates = getAllTemplates();
  return Object.entries(templates).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
    isCustom: template.isCustom || false
  }));
}

/**
 * Get a template by ID
 */
export function getTemplate(id) {
  const templates = getAllTemplates();
  return templates[id] || null;
}

/**
 * Load template variables from user config
 */
function loadConfigVariables() {
  const configPath = join(homedir(), '.atlas', 'config.json');
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    return config?.preferences?.templateVariables || {};
  } catch {
    return {};
  }
}

/**
 * Resolve a `{{user}}` value: config templateVariables.user takes
 * precedence (checked by the caller via configVars merge order), falling
 * back to `git config user.name`, then $USER, then a generic default.
 * Fixes the bug where `atlas init -t <template>` (which passes only
 * `{name}`) left `{{user}}` unsubstituted whenever config had no
 * templateVariables.user set.
 */
function resolveGitUserName() {
  try {
    const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf-8' }).trim();
    return name || null;
  } catch {
    return null;
  }
}

/**
 * Apply template with variables
 * Merges: defaults < config variables < explicit variables
 */
export function applyTemplate(templateId, variables = {}) {
  const template = getTemplate(templateId);
  if (!template) return null;

  let content = template.status;

  // Load config variables synchronously for simplicity
  const configVars = loadConfigVariables();

  // Replace variables (order: defaults < config < explicit)
  const defaults = {
    name: 'my-project',
    user: resolveGitUserName() || process.env.USER || 'user',
    date: new Date().toISOString().split('T')[0]
  };

  const vars = { ...defaults, ...configVars, ...variables };

  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return content;
}

/**
 * Get template IDs for CLI completion
 */
export function getTemplateIds() {
  return Object.keys(getAllTemplates());
}

/**
 * Save a custom template
 */
export function saveTemplate(id, { name, description, status, extends: extendsId }) {
  // Ensure templates directory exists
  if (!existsSync(USER_TEMPLATES_DIR)) {
    mkdirSync(USER_TEMPLATES_DIR, { recursive: true });
  }

  let frontmatter = `name: ${name || id}
description: ${description || 'Custom template'}`;

  if (extendsId) {
    frontmatter += `\nextends: ${extendsId}`;
  }

  const content = `---
${frontmatter}
---
${status}`;

  const filePath = join(USER_TEMPLATES_DIR, `${id}.md`);
  writeFileSync(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Delete a custom template
 */
export function deleteTemplate(id) {
  const filePath = join(USER_TEMPLATES_DIR, `${id}.md`);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Export a builtin template for customization
 */
export function exportTemplate(id) {
  const template = BUILTIN_TEMPLATES[id];
  if (!template) return null;

  return saveTemplate(`${id}-custom`, template);
}

/**
 * Get the user templates directory path
 */
export function getTemplatesDir() {
  return USER_TEMPLATES_DIR;
}

export default {
  listTemplates,
  getTemplate,
  applyTemplate,
  getTemplateIds,
  saveTemplate,
  deleteTemplate,
  exportTemplate,
  getTemplatesDir
};
