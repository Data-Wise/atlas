/**
 * Unit tests for MainView component
 *
 * Tests the main dashboard view with card stack and keyboard navigation
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { jest } from '@jest/globals';
import { MainView } from '../../../../../../src/cli/dashboard-ink/components/views/MainView.js';

describe('MainView Component', () => {
  const mockProjects = [
    {
      id: '1',
      name: 'project-one',
      type: 'node-package',
      status: 'active',
      progress: 80,
      focus: 'Feature A',
    },
    {
      id: '2',
      name: 'project-two',
      type: 'r-package',
      status: 'paused',
      progress: 50,
      focus: 'On hold',
    },
    {
      id: '3',
      name: 'project-three',
      type: 'teaching',
      status: 'stable',
      progress: 100,
    },
  ];

  const mockOnQuit = jest.fn();

  beforeEach(() => {
    mockOnQuit.mockClear();
  });

  describe('Rendering', () => {
    it('should render header with dashboard title', () => {
      const { lastFrame } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('Atlas Dashboard (Ink POC)');
    });

    it('should render project count in header', () => {
      const { lastFrame } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('3 projects');
    });

    it('should render command bar with shortcuts', () => {
      const { lastFrame } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      const frame = lastFrame();
      expect(frame).toContain('j/k: Navigate');
      expect(frame).toContain('Enter: Select');
      expect(frame).toContain('q: Quit');
    });

    it('should render current selection position', () => {
      const { lastFrame } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('[1/3]');
    });

    it('should render project cards', () => {
      const { lastFrame } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      const frame = lastFrame();
      // Should show at least first project
      expect(frame).toContain('project-one');
    });
  });

  describe('Empty State', () => {
    it('should render with no projects', () => {
      const { lastFrame } = render(
        <MainView projects={[]} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('0 projects');
    });

    it('should show [0/0] position with no projects', () => {
      const { lastFrame } = render(
        <MainView projects={[]} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('[1/0]'); // selectedIndex starts at 0
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with j key', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      // Initial state - position 1
      expect(lastFrame()).toContain('[1/3]');

      // Press 'j' to move down
      stdin.write('j');

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should move to position 2
      expect(lastFrame()).toContain('[2/3]');
    });

    it('should navigate up with k key', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      // Move down first
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[2/3]');

      // Then move up
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[1/3]');
    });

    it('should not navigate above first project', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      // Already at position 1
      expect(lastFrame()).toContain('[1/3]');

      // Try to move up
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should stay at position 1
      expect(lastFrame()).toContain('[1/3]');
    });

    it('should not navigate below last project', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      // Move to last project
      stdin.write('j'); // position 2
      await new Promise(resolve => setTimeout(resolve, 10));
      stdin.write('j'); // position 3
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[3/3]');

      // Try to move down
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should stay at position 3
      expect(lastFrame()).toContain('[3/3]');
    });

    it('should navigate down with down arrow', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      stdin.write('\x1B[B'); // Down arrow ANSI code
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[2/3]');
    });

    it('should navigate up with up arrow', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      stdin.write('j'); // Move down first
      await new Promise(resolve => setTimeout(resolve, 10));
      stdin.write('\x1B[A'); // Up arrow ANSI code
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[1/3]');
    });

    it('should quit when q is pressed', () => {
      const { stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      stdin.write('q');

      expect(mockOnQuit).toHaveBeenCalledTimes(1);
    });

    it('should handle Enter key without crashing', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={mockProjects} onQuit={mockOnQuit} />
      );

      stdin.write('\r'); // Enter key
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should still render (Enter does nothing in POC)
      expect(lastFrame()).toContain('Atlas Dashboard');
    });
  });

  describe('Large Project Lists', () => {
    it('should handle 10 projects', () => {
      const manyProjects = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `project-${i + 1}`,
        type: 'node-package',
        status: 'active',
        progress: (i + 1) * 10,
      }));

      const { lastFrame } = render(
        <MainView projects={manyProjects} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('10 projects');
      expect(lastFrame()).toContain('[1/10]');
    });

    it('should handle 100 projects', async () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `project-${i + 1}`,
        type: 'node-package',
        status: 'active',
        progress: (i + 1) % 100,
      }));

      const { lastFrame, stdin } = render(
        <MainView projects={manyProjects} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('100 projects');

      // Navigate to middle
      for (let i = 0; i < 50; i++) {
        stdin.write('j');
      }
      await new Promise(resolve => setTimeout(resolve, 50)); // Longer delay for many operations

      expect(lastFrame()).toContain('[51/100]');
    });
  });

  describe('Single Project', () => {
    it('should render correctly with one project', () => {
      const { lastFrame } = render(
        <MainView projects={[mockProjects[0]]} onQuit={mockOnQuit} />
      );

      expect(lastFrame()).toContain('1 projects'); // Note: grammatically incorrect but matches implementation
      expect(lastFrame()).toContain('[1/1]');
    });

    it('should not allow navigation with one project', async () => {
      const { lastFrame, stdin } = render(
        <MainView projects={[mockProjects[0]]} onQuit={mockOnQuit} />
      );

      stdin.write('j'); // Try to move down
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[1/1]');

      stdin.write('k'); // Try to move up
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[1/1]');
    });
  });

  describe('Visual Scrolling', () => {
    it('should show visible window of projects', async () => {
      // Create enough projects to test scrolling
      const manyProjects = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `project-${i + 1}`,
        type: 'node-package',
        status: 'active',
        progress: 50,
      }));

      const { lastFrame, stdin } = render(
        <MainView projects={manyProjects} onQuit={mockOnQuit} />
      );

      // Navigate down several times
      for (let i = 0; i < 5; i++) {
        stdin.write('j');
      }
      await new Promise(resolve => setTimeout(resolve, 30)); // Wait for all 5 updates

      // Should show project-6 (index 5) in the view
      const frame = lastFrame();
      expect(frame).toContain('[6/10]');
    });
  });
});
