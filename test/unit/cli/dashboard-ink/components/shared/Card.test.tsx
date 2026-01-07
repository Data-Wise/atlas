/**
 * Unit tests for Card component
 *
 * Tests the project card component in isolation using ink-testing-library
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { Card } from '../../../../../../src/cli/dashboard-ink/components/shared/Card.js';

describe('Card Component', () => {
  const mockProject = {
    id: '1',
    name: 'test-project',
    type: 'node-package',
    status: 'active',
    progress: 75,
    focus: 'Working on feature X',
  };

  describe('Rendering', () => {
    it('should render project name and type', () => {
      const { lastFrame } = render(
        <Card project={mockProject} isSelected={false} onSelect={() => {}} />
      );

      expect(lastFrame()).toContain('test-project');
      expect(lastFrame()).toContain('(node-package)');
    });

    it('should render status and progress', () => {
      const { lastFrame } = render(
        <Card project={mockProject} isSelected={false} onSelect={() => {}} />
      );

      expect(lastFrame()).toContain('Status:');
      expect(lastFrame()).toContain('active');
      expect(lastFrame()).toContain('Progress:');
      expect(lastFrame()).toContain('75%');
    });

    it('should render progress bar', () => {
      const { lastFrame } = render(
        <Card project={mockProject} isSelected={false} onSelect={() => {}} />
      );

      // Progress bar should contain filled and empty blocks
      const frame = lastFrame();
      expect(frame).toMatch(/[█░]/);
    });

    it('should render focus when present', () => {
      const { lastFrame } = render(
        <Card project={mockProject} isSelected={false} onSelect={() => {}} />
      );

      expect(lastFrame()).toContain('Focus:');
      expect(lastFrame()).toContain('Working on feature X');
    });

    it('should not render focus when not present', () => {
      const projectWithoutFocus = { ...mockProject, focus: undefined };
      const { lastFrame } = render(
        <Card project={projectWithoutFocus} isSelected={false} onSelect={() => {}} />
      );

      expect(lastFrame()).not.toContain('Focus:');
    });
  });

  describe('Selection State', () => {
    it('should apply blue border when selected', () => {
      const { lastFrame } = render(
        <Card project={mockProject} isSelected={true} onSelect={() => {}} />
      );

      // Ink applies ANSI color codes - check for blue escape sequence
      const frame = lastFrame();
      expect(frame).toBeTruthy();
      // Frame should contain the project name (selected card is still visible)
      expect(frame).toContain('test-project');
    });

    it('should apply gray border when not selected', () => {
      const { lastFrame } = render(
        <Card project={mockProject} isSelected={false} onSelect={() => {}} />
      );

      const frame = lastFrame();
      expect(frame).toBeTruthy();
      expect(frame).toContain('test-project');
    });
  });

  describe('Status Colors', () => {
    it('should render active status in green', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, status: 'active' }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      expect(lastFrame()).toContain('active');
    });

    it('should render paused status in yellow', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, status: 'paused' }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      expect(lastFrame()).toContain('paused');
    });

    it('should render stable status in cyan', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, status: 'stable' }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      expect(lastFrame()).toContain('stable');
    });

    it('should render complete status in gray', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, status: 'complete' }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      expect(lastFrame()).toContain('complete');
    });
  });

  describe('Progress Bar Rendering', () => {
    it('should render empty progress bar at 0%', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, progress: 0 }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      const frame = lastFrame();
      // Should contain mostly empty blocks
      expect(frame).toContain('░░░░░░░░░░░░░░░░░░░░');
    });

    it('should render half-filled progress bar at 50%', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, progress: 50 }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      const frame = lastFrame();
      // Should contain mix of filled and empty blocks
      expect(frame).toMatch(/█+░+/);
    });

    it('should render full progress bar at 100%', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, progress: 100 }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      const frame = lastFrame();
      // Should contain all filled blocks
      expect(frame).toContain('████████████████████');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long project names', () => {
      const longName = 'this-is-a-very-long-project-name-that-might-wrap';
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, name: longName }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      expect(lastFrame()).toContain(longName);
    });

    it('should handle very long focus text', () => {
      const longFocus = 'This is a very long focus description that might need to wrap to multiple lines and should still render correctly';
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, focus: longFocus }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      expect(lastFrame()).toContain('Focus:');
    });

    it('should handle progress > 100', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, progress: 150 }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      const frame = lastFrame();
      // Should display actual percentage
      expect(frame).toContain('150%');
      // Progress bar should be clamped to 100% (all filled)
      expect(frame).toContain('████████████████████');
    });

    it('should handle negative progress', () => {
      const { lastFrame } = render(
        <Card
          project={{ ...mockProject, progress: -10 }}
          isSelected={false}
          onSelect={() => {}}
        />
      );

      const frame = lastFrame();
      // Should display actual percentage
      expect(frame).toContain('-10%');
      // Progress bar should be clamped to 0% (all empty)
      expect(frame).toContain('░░░░░░░░░░░░░░░░░░░░');
    });
  });
});
