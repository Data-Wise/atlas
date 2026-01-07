/**
 * E2E tests for Ink Dashboard App
 *
 * Tests the full application flow including rendering, navigation, and quitting
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { jest } from '@jest/globals';
import { App } from '../../../src/cli/dashboard-ink/components/App.js';

describe('Ink Dashboard App - E2E', () => {
  const mockOnExit = jest.fn();

  beforeEach(() => {
    mockOnExit.mockClear();
  });

  describe('Full Application Flow', () => {
    it('should render complete app with all components', () => {
      const { lastFrame } = render(<App onExit={mockOnExit} />);

      const frame = lastFrame();

      // Header
      expect(frame).toContain('Atlas Dashboard (Ink POC)');
      expect(frame).toContain('5 projects'); // Mock data has 5 projects

      // Project cards (should show at least first project)
      expect(frame).toContain('atlas');
      expect(frame).toContain('node-package');

      // Command bar
      expect(frame).toContain('j/k: Navigate');
      expect(frame).toContain('q: Quit');

      // Selection indicator
      expect(frame).toContain('[1/5]');
    });

    it('should display all mock projects', () => {
      const { lastFrame } = render(<App onExit={mockOnExit} />);

      const frame = lastFrame();

      // All mock project names should be visible at some point
      // (though not all at once due to scrolling)
      expect(frame).toContain('atlas');
    });

    it('should show project details in cards', () => {
      const { lastFrame } = render(<App onExit={mockOnExit} />);

      const frame = lastFrame();

      // Status and progress
      expect(frame).toContain('Status:');
      expect(frame).toContain('Progress:');

      // Progress bars
      expect(frame).toMatch(/[█░]/);

      // Focus information
      expect(frame).toContain('Focus:');
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate through all projects', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Start at project 1
      expect(lastFrame()).toContain('[1/5]');

      // Navigate to project 2
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[2/5]');

      // Navigate to project 3
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[3/5]');

      // Navigate to project 4
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[4/5]');

      // Navigate to project 5
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[5/5]');
    });

    it('should navigate forward and backward', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Move forward
      stdin.write('j');
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(lastFrame()).toContain('[3/5]');

      // Move backward
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[2/5]');

      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[1/5]');
    });

    it('should use arrow keys for navigation', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Down arrow
      stdin.write('\x1B[B');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[2/5]');

      // Up arrow
      stdin.write('\x1B[A');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('[1/5]');
    });

    it('should stay within bounds at top', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Try to go above first project
      stdin.write('k');
      stdin.write('k');
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(lastFrame()).toContain('[1/5]');
    });

    it('should stay within bounds at bottom', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Navigate to last project
      for (let i = 0; i < 10; i++) {
        stdin.write('j');
      }
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(lastFrame()).toContain('[5/5]');
    });
  });

  describe('Exit Flow', () => {
    it('should call onExit when q is pressed', () => {
      const { stdin } = render(<App onExit={mockOnExit} />);

      stdin.write('q');

      expect(mockOnExit).toHaveBeenCalledTimes(1);
    });

    it('should not exit on other keys', () => {
      const { stdin } = render(<App onExit={mockOnExit} />);

      stdin.write('j');
      stdin.write('k');
      stdin.write('\r'); // Enter

      expect(mockOnExit).not.toHaveBeenCalled();
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain layout after navigation', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Navigate multiple times
      stdin.write('j');
      stdin.write('j');
      stdin.write('k');
      await new Promise(resolve => setTimeout(resolve, 30));

      const frame = lastFrame();

      // Layout should still be intact
      expect(frame).toContain('Atlas Dashboard (Ink POC)');
      expect(frame).toContain('j/k: Navigate');
      expect(frame).toContain('[2/5]');
    });

    it('should show borders for all cards', () => {
      const { lastFrame } = render(<App onExit={mockOnExit} />);

      const frame = lastFrame();

      // Should contain box drawing characters
      expect(frame).toMatch(/[╭╮╰╯─│]/);
    });

    it('should display progress bars correctly', () => {
      const { lastFrame } = render(<App onExit={mockOnExit} />);

      const frame = lastFrame();

      // Progress bars use block characters
      expect(frame).toContain('█'); // Filled block
      expect(frame).toContain('░'); // Empty block (if progress < 100%)
    });
  });

  describe('Mock Data Verification', () => {
    it('should load atlas project data', () => {
      const { lastFrame } = render(<App onExit={mockOnExit} />);

      const frame = lastFrame();

      expect(frame).toContain('atlas');
      expect(frame).toContain('node-package');
      expect(frame).toContain('v0.9.0 Sprint 1 - TUI Modernization');
      expect(frame).toContain('100%');
    });

    it('should load flow-cli project data', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Navigate to second project
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));

      const frame = lastFrame();

      expect(frame).toContain('flow-cli');
      expect(frame).toContain('zsh-package');
      expect(frame).toContain('stable');
    });

    it('should show different statuses', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Navigate through projects to see different statuses
      expect(lastFrame()).toContain('active'); // atlas

      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('stable'); // flow-cli

      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('active'); // mcp-server

      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('paused'); // rmediation
    });

    it('should show progress values ranging from 0-100', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Project 1: 100%
      expect(lastFrame()).toContain('100%');

      // Navigate through to see different progress values
      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('95%');

      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('80%');

      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('60%');

      stdin.write('j');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(lastFrame()).toContain('45%');
    });
  });

  describe('Stress Tests', () => {
    it('should handle rapid navigation', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Rapid down navigation
      for (let i = 0; i < 20; i++) {
        stdin.write('j');
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for all updates

      // Should be at last project
      expect(lastFrame()).toContain('[5/5]');

      // Rapid up navigation
      for (let i = 0; i < 20; i++) {
        stdin.write('k');
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for all updates

      // Should be at first project
      expect(lastFrame()).toContain('[1/5]');
    });

    it('should handle mixed key presses', async () => {
      const { lastFrame, stdin } = render(<App onExit={mockOnExit} />);

      // Mix of navigation and other keys
      stdin.write('j');      // pos 1 -> 2
      stdin.write('\r');     // Enter (no-op)
      stdin.write('k');      // pos 2 -> 1
      stdin.write('\x1B[B'); // Down arrow: pos 1 -> 2
      stdin.write('j');      // pos 2 -> 3
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still render correctly
      expect(lastFrame()).toContain('Atlas Dashboard');
      expect(lastFrame()).toContain('[3/5]'); // Final position is 3
    });
  });

  describe('Performance', () => {
    it('should render within reasonable time', () => {
      const startTime = Date.now();

      render(<App onExit={mockOnExit} />);

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render in less than 1 second
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle navigation without lag', async () => {
      const { stdin } = render(<App onExit={mockOnExit} />);

      const startTime = Date.now();

      // Perform multiple navigations
      for (let i = 0; i < 10; i++) {
        stdin.write('j');
      }
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for all updates

      const endTime = Date.now();
      const navTime = endTime - startTime;

      // Navigation should be fast (including our wait time)
      expect(navTime).toBeLessThan(200);
    });
  });
});
