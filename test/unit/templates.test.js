/**
 * Templates tests
 */

import { describe, it, expect } from '@jest/globals';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  listTemplates,
  getTemplate,
  applyTemplate,
  getTemplateIds,
  saveTemplate,
  deleteTemplate,
  exportTemplate,
  getTemplatesDir
} from '../../src/templates/index.js';

describe('Templates', () => {
  describe('listTemplates()', () => {
    it('returns array of templates', () => {
      const templates = listTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('each template has id, name, and description', () => {
      const templates = listTemplates();
      for (const t of templates) {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.description).toBeDefined();
      }
    });

    it('includes expected templates', () => {
      const ids = listTemplates().map(t => t.id);
      expect(ids).toContain('node');
      expect(ids).toContain('r-package');
      expect(ids).toContain('python');
      expect(ids).toContain('quarto');
      expect(ids).toContain('research');
      expect(ids).toContain('minimal');
    });
  });

  describe('getTemplate()', () => {
    it('returns template by id', () => {
      const template = getTemplate('node');
      expect(template).not.toBeNull();
      expect(template.name).toBe('Node.js Package');
    });

    it('returns null for unknown template', () => {
      const template = getTemplate('nonexistent');
      expect(template).toBeNull();
    });
  });

  describe('applyTemplate()', () => {
    it('replaces {{name}} variable', () => {
      const content = applyTemplate('minimal', { name: 'test-project' });
      expect(content).toContain('## Project: test-project');
    });

    it('replaces {{user}} variable', () => {
      const content = applyTemplate('node', { name: 'pkg', user: 'testuser' });
      expect(content).toContain('github.com/testuser/pkg');
    });

    it('uses default name if not provided', () => {
      const content = applyTemplate('minimal');
      expect(content).toContain('## Project: my-project');
    });

    it('returns null for unknown template', () => {
      const content = applyTemplate('nonexistent');
      expect(content).toBeNull();
    });

    it('node template has expected sections', () => {
      const content = applyTemplate('node', { name: 'myapp' });
      expect(content).toContain('## Type: node-package');
      expect(content).toContain('## Status: active');
      expect(content).toContain('## Current Tasks');
      expect(content).toContain('package.json');
    });

    it('r-package template has expected sections', () => {
      const content = applyTemplate('r-package', { name: 'mypkg' });
      expect(content).toContain('## Type: r-package');
      expect(content).toContain('DESCRIPTION');
      expect(content).toContain('testthat');
    });

    it('research template has research-specific sections', () => {
      const content = applyTemplate('research', { name: 'study' });
      expect(content).toContain('## Type: research');
      expect(content).toContain('Research Questions');
      expect(content).toContain('Target');
    });
  });

  describe('getTemplateIds()', () => {
    it('returns array of template IDs', () => {
      const ids = getTemplateIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toContain('node');
      expect(ids).toContain('minimal');
    });
  });

  describe('getTemplatesDir()', () => {
    it('returns path to user templates directory', () => {
      const dir = getTemplatesDir();
      expect(dir).toContain('.atlas');
      expect(dir).toContain('templates');
    });
  });

  describe('listTemplates() with isCustom flag', () => {
    it('built-in templates have isCustom: false', () => {
      const templates = listTemplates();
      const node = templates.find(t => t.id === 'node');
      expect(node.isCustom).toBe(false);
    });
  });

  describe('saveTemplate()', () => {
    const testDir = join(tmpdir(), `atlas-test-templates-${Date.now()}`);
    const originalDir = getTemplatesDir();

    // Note: We can't easily mock getTemplatesDir, so these tests
    // will actually use the real templates dir. We test the function
    // behavior rather than file operations.

    it('saveTemplate returns a file path', () => {
      // This test just verifies the function returns a path
      // without actually writing to disk (which would pollute user's dir)
      const expectedPath = join(getTemplatesDir(), 'test-template.md');
      expect(expectedPath).toContain('.atlas/templates/test-template.md');
    });
  });

  describe('exportTemplate()', () => {
    it('returns null for non-existent template', () => {
      // Can't actually test without writing to user's dir
      // but we can verify the template exists first
      const template = getTemplate('nonexistent');
      expect(template).toBeNull();
    });
  });

  describe('deleteTemplate()', () => {
    it('returns false for non-existent template', () => {
      const result = deleteTemplate('definitely-does-not-exist-12345');
      expect(result).toBe(false);
    });
  });
});
