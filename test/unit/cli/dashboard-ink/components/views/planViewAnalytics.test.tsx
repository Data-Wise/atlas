/**
 * Unit tests for PlanView's analytics-pane pure functions
 *
 * Migrated from AnalyticsView.test.tsx (SPEC-tui-consolidation-2026-07-19.md) —
 * Full component rendering is covered by dogfood tests (real-data-pipeline.sh).
 */

const asciiSparkline = (values: number[]): string => {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const chars = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  return values
    .map(v => chars[Math.min(Math.floor((v / max) * (chars.length - 1)), chars.length - 1)])
    .join('');
};

describe('asciiSparkline', () => {
  it('renders block characters proportional to values', () => {
    expect(asciiSparkline([10, 20, 30, 40, 50])).toBe('\u2582\u2583\u2585\u2586\u2588');
  });

  it('returns empty string for empty array', () => {
    expect(asciiSparkline([])).toBe('');
  });

  it('uses lowest block for zero values', () => {
    expect(asciiSparkline([0, 0, 0])).toBe('\u2581\u2581\u2581');
  });

  it('renders correct length for multi-day data', () => {
    const data = Array.from({ length: 30 }, (_, i) => (i + 1) * 3);
    expect(asciiSparkline(data).length).toBe(30);
  });

  it('uses highest block for equal max values', () => {
    expect(asciiSparkline([100, 100, 100])).toBe('\u2588\u2588\u2588');
  });
});
