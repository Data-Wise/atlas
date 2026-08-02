/**
 * Unit tests for shared/ProjectList's nudge badges (firedNudges/pendingNudges).
 * See SPEC-dashboard-nudge-awareness-2026-08-01.md §Design 4.
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { ProjectList } from '../../../../../../src/cli/dashboard-ink/components/shared/ProjectList.js';
import type { Project } from '../../../../../../src/cli/dashboard-ink/types.js';

describe('ProjectList nudge badges', () => {
  const baseProject: Project = {
    id: '1',
    name: 'atlas',
    type: 'node-package',
    status: 'active',
    progress: 75,
  };

  const projects: Project[] = [baseProject];
  const mockOnSelect = () => {};
  const mockOnSelectProject = () => {};

  it('shows no nudge badges when both counts are 0', () => {
    // The row's own status icon can legitimately be '●' or '○' (see
    // statusIcon()/STATUS_ICON), so assert on the badge shape (glyph
    // immediately followed by a digit), not on bare glyph presence.
    const { lastFrame } = render(
      <ProjectList
        projects={projects}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSelectProject={mockOnSelectProject}
        isActive={false}
      />
    );

    expect(lastFrame()).not.toMatch(/●\d/);
    expect(lastFrame()).not.toMatch(/○\d/);
  });

  it('shows the fired badge (●) with the count when firedNudges > 0', () => {
    const { lastFrame } = render(
      <ProjectList
        projects={projects}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSelectProject={mockOnSelectProject}
        isActive={false}
        firedNudges={2}
      />
    );

    expect(lastFrame()).toContain('●2');
  });

  it('shows the pending badge (○) with the count when pendingNudges > 0', () => {
    const { lastFrame } = render(
      <ProjectList
        projects={projects}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSelectProject={mockOnSelectProject}
        isActive={false}
        pendingNudges={3}
      />
    );

    expect(lastFrame()).toContain('○3');
  });

  it('shows both badges together, distinctly, when both counts are > 0', () => {
    const { lastFrame } = render(
      <ProjectList
        projects={projects}
        selectedIndex={0}
        onSelect={mockOnSelect}
        onSelectProject={mockOnSelectProject}
        isActive={false}
        firedNudges={1}
        pendingNudges={4}
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('●1');
    expect(frame).toContain('○4');
  });
});
