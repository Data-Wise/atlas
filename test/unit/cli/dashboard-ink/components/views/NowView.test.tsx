/**
 * Unit tests for NowView component (v0.14 3-view consolidation)
 *
 * Migrated from MainView.test.tsx (SPEC-tui-consolidation-2026-07-19.md).
 * NowView absorbs MainView + DetailView + InspectorPanel + EcosystemView,
 * so this suite covers: project list rendering, j/k navigation, Enter
 * selection updating the detail pane, the `e` ecosystem toggle, and q:quit —
 * the behaviors the spec requires not to regress.
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { jest } from '@jest/globals';
import { NowView } from '../../../../../../src/cli/dashboard-ink/components/views/NowView.js';

describe('NowView Component', () => {
  const mockProjects = [
    { id: '1', name: 'project-one', type: 'node-package', status: 'active', progress: 80, focus: 'Feature A' },
    { id: '2', name: 'project-two', type: 'r-package', status: 'paused', progress: 50, focus: 'On hold' },
    { id: '3', name: 'project-three', type: 'teaching', status: 'stable', progress: 100 },
  ];

  const mockOnQuit = jest.fn();
  const mockOnSelectProject = jest.fn();
  const mockOnSelectedIndexChange = jest.fn();

  beforeEach(() => {
    mockOnQuit.mockClear();
    mockOnSelectProject.mockClear();
    mockOnSelectedIndexChange.mockClear();
  });

  function renderNow(overrides = {}) {
    return render(
      <NowView
        projects={mockProjects}
        onQuit={mockOnQuit}
        isActive={true}
        selectedProject={mockProjects[0]}
        onSelectProject={mockOnSelectProject}
        selectedIndex={0}
        onSelectedIndexChange={mockOnSelectedIndexChange}
        {...overrides}
      />
    );
  }

  describe('Rendering', () => {
    it('renders the project list header with count', () => {
      const { lastFrame } = renderNow();
      expect(lastFrame()).toContain('Projects');
      expect(lastFrame()).toContain('3');
    });

    it('renders project rows', () => {
      const { lastFrame } = renderNow();
      expect(lastFrame()).toContain('project-one');
    });

    it('renders detail pane for the selected project', () => {
      const { lastFrame } = renderNow();
      expect(lastFrame()).toContain('project-one');
      expect(lastFrame()).toContain('Feature A');
    });

    it('renders empty state when no project selected', () => {
      const { lastFrame } = renderNow({ selectedProject: null });
      expect(lastFrame()).toContain('Select a project');
    });
  });

  describe('Keyboard navigation (delegated to shared ProjectList)', () => {
    it('j moves the list selection index forward', async () => {
      const { stdin } = renderNow();
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockOnSelectedIndexChange).toHaveBeenCalledWith(1);
    });

    it('k does not move below index 0', async () => {
      const { stdin } = renderNow();
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockOnSelectedIndexChange).toHaveBeenCalledWith(0);
    });

    it('Enter fires onSelectProject with the highlighted project', async () => {
      const { stdin } = renderNow();
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockOnSelectProject).toHaveBeenCalledWith(mockProjects[0]);
    });

    it('q fires onQuit', () => {
      const { stdin } = renderNow();
      stdin.write('q');
      expect(mockOnQuit).toHaveBeenCalledTimes(1);
    });

    it('does not respond to keys when isActive=false', async () => {
      const { stdin } = renderNow({ isActive: false });
      stdin.write('q');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockOnQuit).not.toHaveBeenCalled();
    });
  });

  describe('Ecosystem toggle (e key, absorbs EcosystemView)', () => {
    it('e toggles the right pane to ecosystem-wide stats', async () => {
      const { lastFrame, stdin } = renderNow();
      expect(lastFrame()).toContain('Detail');

      stdin.write('e');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(lastFrame()).toContain('Ecosystem');
    });

    it('pressing e twice returns to the detail pane', async () => {
      const { lastFrame, stdin } = renderNow();
      stdin.write('e');
      await new Promise(resolve => setTimeout(resolve, 10));
      stdin.write('e');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('Detail');
    });

    it('ecosystem pane shows aggregate stats across all projects', async () => {
      const { lastFrame, stdin } = renderNow();
      stdin.write('e');
      await new Promise(resolve => setTimeout(resolve, 10));
      const frame = lastFrame();
      expect(frame).toContain('active');
      expect(frame).toContain('total');
    });
  });

  describe('Large project lists', () => {
    it('handles 10 projects', () => {
      const many = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`, name: `project-${i + 1}`, type: 'node-package', status: 'active', progress: (i + 1) * 10,
      }));
      const { lastFrame } = renderNow({ projects: many, selectedProject: many[0] });
      expect(lastFrame()).toContain('10');
    });
  });
});
