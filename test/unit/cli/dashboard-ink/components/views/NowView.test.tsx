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

  describe('Nudge banner + ack (#115, SPEC-dashboard-nudge-awareness)', () => {
    const FIRED_A = { id: 'ndg_a', time: '09:00', message: 'stand up', recurring: false, state: 'fired' };
    const FIRED_B = { id: 'ndg_b', time: '11:30', message: 'water', recurring: true, state: 'fired' };
    const FIRED_C = { id: 'ndg_c', time: '13:00', message: 'stretch', recurring: false, state: 'fired' };
    const FIRED_D = { id: 'ndg_d', time: '15:00', message: 'walk', recurring: false, state: 'fired' };

    it('renders no banner when there are no fired nudges', () => {
      const { lastFrame } = renderNow();
      expect(lastFrame()).not.toContain('ack all');
    });

    it('renders up to 3 fired nudges with time + message', () => {
      const { lastFrame } = renderNow({ firedNudges: [FIRED_A, FIRED_B] });
      const frame = lastFrame();
      expect(frame).toContain('09:00');
      expect(frame).toContain('stand up');
      expect(frame).toContain('11:30');
      expect(frame).toContain('water');
      expect(frame).toContain('a: ack all');
    });

    it('shows "+N more" when more than 3 nudges are fired', () => {
      const { lastFrame } = renderNow({ firedNudges: [FIRED_A, FIRED_B, FIRED_C, FIRED_D] });
      const frame = lastFrame();
      expect(frame).toContain('+1 more');
      // Only the first 3 are listed individually.
      expect(frame).not.toContain('walk');
    });

    it('shows ackError text when set', () => {
      const { lastFrame } = renderNow({ firedNudges: [FIRED_A], ackError: '1 of 2 not acked: boom' });
      expect(lastFrame()).toContain('1 of 2 not acked: boom');
    });

    it('shows "acking…" instead of the hint while acking', () => {
      const { lastFrame } = renderNow({ firedNudges: [FIRED_A], acking: true });
      const frame = lastFrame();
      expect(frame).toContain('acking…');
      expect(frame).not.toContain('a: ack all');
    });

    it('pressing a calls onAckNudges when fired nudges exist and not acking', async () => {
      const onAckNudges = jest.fn();
      const { stdin } = renderNow({ firedNudges: [FIRED_A], onAckNudges });
      stdin.write('a');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(onAckNudges).toHaveBeenCalledTimes(1);
    });

    it('pressing a is a no-op when there are no fired nudges', async () => {
      const onAckNudges = jest.fn();
      const { stdin } = renderNow({ firedNudges: [], onAckNudges });
      stdin.write('a');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(onAckNudges).not.toHaveBeenCalled();
    });

    it('pressing a is a no-op while already acking', async () => {
      const onAckNudges = jest.fn();
      const { stdin } = renderNow({ firedNudges: [FIRED_A], acking: true, onAckNudges });
      stdin.write('a');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(onAckNudges).not.toHaveBeenCalled();
    });

    it('does not respond to a when isActive=false', async () => {
      const onAckNudges = jest.fn();
      const { stdin } = renderNow({ firedNudges: [FIRED_A], onAckNudges, isActive: false });
      stdin.write('a');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(onAckNudges).not.toHaveBeenCalled();
    });
  });
});
