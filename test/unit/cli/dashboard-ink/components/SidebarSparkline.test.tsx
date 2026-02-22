/**
 * Unit tests for SidebarPanel sparklines and focus tier icons
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { SidebarPanel } from '../../../../../src/cli/dashboard-ink/components/SidebarPanel.js';
import type { Project } from '../../../../../src/cli/dashboard-ink/types.js';

describe('SidebarPanel Sparklines & Focus Tier', () => {
  const baseProject: Project = {
    id: '1',
    name: 'atlas',
    type: 'node-package',
    status: 'active',
    progress: 75,
  };

  const mockOnSelect = () => {};
  const mockOnSelectProject = () => {};

  describe('Focus tier icon', () => {
    it('should display focus tier symbol when focusTier is provided', () => {
      const projects: Project[] = [{
        ...baseProject,
        focusTier: { symbol: '◕', color: 'green', label: 'strong' },
      }];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      expect(lastFrame()).toContain('◕');
    });

    it('should fall back to status icon when focusTier is not provided', () => {
      const projects: Project[] = [baseProject];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      // Status icon for 'active' is '●'
      expect(lastFrame()).toContain('●');
    });
  });

  describe('Inline sparkline', () => {
    it('should display sparkline characters when recentActivity is provided', () => {
      const projects: Project[] = [{
        ...baseProject,
        recentActivity: [0, 20, 40, 60, 80],
      }];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      const frame = lastFrame();
      // Should contain at least some sparkline block chars
      expect(frame).toMatch(/[▁▂▃▄▅▆▇█·]/);
    });

    it('should show dots for all-zero activity', () => {
      const projects: Project[] = [{
        ...baseProject,
        recentActivity: [0, 0, 0, 0, 0],
      }];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      expect(lastFrame()).toContain('·····');
    });

    it('should not show sparkline when recentActivity is absent', () => {
      const projects: Project[] = [baseProject];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      const frame = lastFrame();
      // No sparkline chars should appear
      expect(frame).not.toMatch(/[▁▂▃▄▅▆▇]/);
      expect(frame).not.toContain('·····');
    });

    it('should render maximum block for peak value', () => {
      const projects: Project[] = [{
        ...baseProject,
        recentActivity: [100, 100, 100, 100, 100],
      }];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      // All values are equal max, so all should be full block
      expect(lastFrame()).toContain('█████');
    });
  });

  describe('Combined display', () => {
    it('should show both focus tier icon and sparkline for enriched project', () => {
      const projects: Project[] = [{
        ...baseProject,
        focusTier: { symbol: '●', color: 'greenBright', label: 'deep' },
        focusScore: 90,
        recentActivity: [10, 20, 30, 40, 50],
      }];

      const { lastFrame } = render(
        <SidebarPanel
          projects={projects}
          selectedIndex={0}
          onSelect={mockOnSelect}
          onSelectProject={mockOnSelectProject}
          isActive={false}
        />
      );

      const frame = lastFrame();
      expect(frame).toContain('●');
      expect(frame).toContain('75%');
      expect(frame).toMatch(/[▁▂▃▄▅▆▇█]/);
    });
  });
});
