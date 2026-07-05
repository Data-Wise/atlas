import { formatPatternGrid, formatPatternCallout, buildPatternGrid } from '../../../../src/adapters/presenters/PatternPresenter.js';

describe('PatternPresenter', () => {
  describe('formatPatternGrid', () => {
    it('returns empty string for null/undefined grid', () => {
      expect(formatPatternGrid(null)).toBe('');
      expect(formatPatternGrid(undefined)).toBe('');
    });

    it('returns empty string for grid with wrong number of rows', () => {
      expect(formatPatternGrid([[1, 2, 3]])).toBe('');
    });

    it('formats a 7x24 grid with correct symbols', () => {
      const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
      grid[0][0] = 1.0;
      grid[1][12] = 0.5;
      grid[2][6] = 0.25;
      grid[3][18] = 0.75;
      const result = formatPatternGrid(grid, { showHourLabels: false });
      expect(result).toContain('Sun');
      expect(result).toContain('Mon');
      expect(result).toContain('Sat');
    });

    it('clamps values to valid symbol range', () => {
      const grid = Array.from({ length: 7 }, () => Array(24).fill(-0.5));
      grid[0][0] = 1.5;
      const result = formatPatternGrid(grid, { showHourLabels: false });
      expect(result).toBeTruthy();
    });
  });

  describe('formatPatternCallout', () => {
    it('formats best day and hour', () => {
      const result = formatPatternCallout('Tuesday', '12-2p', []);
      expect(result).toContain('Best');
      expect(result).toContain('Tuesday');
      expect(result).toContain('12-2p');
    });

    it('includes dead zone info', () => {
      const deadZones = [
        { day: 'Monday', hour: '8a', intensity: 0.8 },
        { day: 'Friday', hour: '5p', intensity: 0.9 },
      ];
      const result = formatPatternCallout('Tuesday', '12-2p', deadZones);
      expect(result).toContain('Dead');
      expect(result).toContain('Monday');
    });

    it('returns empty string when no data', () => {
      const result = formatPatternCallout('', '', []);
      expect(result).toBe('');
    });

    it('limits to 2 dead zones', () => {
      const deadZones = [
        { day: 'Mon', hour: '8a', intensity: 0.8 },
        { day: 'Tue', hour: '9a', intensity: 0.7 },
        { day: 'Wed', hour: '10a', intensity: 0.6 },
      ];
      const result = formatPatternCallout('Tue', '12p', deadZones);
      const deadCount = (result.match(/Dead/g) || []).length;
      expect(deadCount).toBeLessThanOrEqual(2);
    });
  });

  describe('buildPatternGrid', () => {
    it('returns 7x24 grid of zeros for empty sessions', () => {
      const grid = buildPatternGrid([]);
      expect(grid).toHaveLength(7);
      expect(grid[0]).toHaveLength(24);
      expect(grid[0][0]).toBe(0);
      expect(grid[6][23]).toBe(0);
    });

    it('buckets sessions by day and hour', () => {
      const sessions = [
        { startTime: new Date('2026-07-02T10:00:00'), getDuration: () => 1200 },
        { startTime: new Date('2026-07-02T10:30:00'), getDuration: () => 1200 },
        { startTime: new Date('2026-07-02T14:00:00'), getDuration: () => 60 },
      ];
      const grid = buildPatternGrid(sessions, 15);
      expect(grid[4][10]).toBeGreaterThan(0);
      expect(grid[4][14]).toBeGreaterThan(0);
    });

    it('skips sessions with invalid startTime', () => {
      const sessions = [
        { startTime: null, getDuration: () => 600 },
        { startTime: 'invalid', getDuration: () => 600 },
      ];
      const grid = buildPatternGrid(sessions);
      expect(grid.flat().every(v => v === 0)).toBe(true);
    });

    it('classifies flow vs non-flow sessions', () => {
      const sessions = [
        { startTime: new Date('2026-07-02T10:00:00'), getDuration: () => 5 },
        { startTime: new Date('2026-07-02T10:30:00'), getDuration: () => 1200 },
      ];
      const grid = buildPatternGrid(sessions, 15);
      const flowRate = grid[4][10];
      expect(flowRate).toBe(0.5);
    });
  });
});
