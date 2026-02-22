/**
 * Unit tests for HeatmapComponent
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { HeatmapComponent } from '../../../../../src/cli/dashboard-ink/components/shared/HeatmapComponent.js';

function makeGrid(rows: number, cols: number, levelFn: (r: number, c: number) => number) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      date: '',
      value: levelFn(r, c) * 10,
      level: levelFn(r, c),
    }))
  );
}

describe('HeatmapComponent', () => {
  describe('Full mode (7 rows)', () => {
    it('should render all 7 day labels', () => {
      const grid = makeGrid(7, 4, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} compact={false} />
      );

      const frame = lastFrame();
      expect(frame).toContain('Mon');
      expect(frame).toContain('Tue');
      expect(frame).toContain('Wed');
      expect(frame).toContain('Thu');
      expect(frame).toContain('Fri');
      expect(frame).toContain('Sat');
      expect(frame).toContain('Sun');
    });

    it('should render heatmap header with week count', () => {
      const grid = makeGrid(7, 8, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={8} />
      );

      expect(lastFrame()).toContain('Activity (8w)');
    });

    it('should render legend', () => {
      const grid = makeGrid(7, 4, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} />
      );

      const frame = lastFrame();
      expect(frame).toContain('less');
      expect(frame).toContain('more');
    });

    it('should render heatmap chars for non-zero levels', () => {
      const grid = makeGrid(7, 4, (r, c) => Math.min(4, c));
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} />
      );

      const frame = lastFrame();
      // Should contain at least some heatmap block chars
      expect(frame).toMatch(/[·░▒▓█]/);
    });
  });

  describe('Compact mode (4 rows)', () => {
    it('should render only Mon/Wed/Fri/Sat labels', () => {
      const grid = makeGrid(7, 4, () => 2);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} compact={true} />
      );

      const frame = lastFrame();
      expect(frame).toContain('Mon');
      expect(frame).toContain('Wed');
      expect(frame).toContain('Fri');
      expect(frame).toContain('Sat');
      // Should NOT contain Tue/Thu/Sun
      expect(frame).not.toContain('Tue');
      expect(frame).not.toContain('Thu');
      expect(frame).not.toContain('Sun');
    });
  });

  describe('Summary line', () => {
    it('should display streak days when provided', () => {
      const grid = makeGrid(7, 4, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} streakDays={5} />
      );

      expect(lastFrame()).toContain('5d streak');
    });

    it('should display total sessions when provided', () => {
      const grid = makeGrid(7, 4, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} totalSessions={42} />
      );

      expect(lastFrame()).toContain('42 sessions');
    });

    it('should display best day when provided', () => {
      const grid = makeGrid(7, 4, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={4} bestDay="Thu 2h15m" />
      );

      expect(lastFrame()).toContain('Best: Thu 2h15m');
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty grid', () => {
      const { lastFrame } = render(
        <HeatmapComponent grid={[]} weeks={0} />
      );

      // Empty output
      expect(lastFrame()).toBe('');
    });

    it('should handle grid with all zeros', () => {
      const grid = makeGrid(7, 13, () => 0);
      const { lastFrame } = render(
        <HeatmapComponent grid={grid} weeks={13} />
      );

      // Should render dots for all empty cells
      expect(lastFrame()).toContain('·');
    });
  });
});
