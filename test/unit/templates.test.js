/**
 * Templates tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  listTemplates,
  getTemplate,
  applyTemplate,
  getTemplateIds
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
});
