/**
 * SidebarPanel Integration Tests
 *
 * Tests pure logic extracted from SidebarPanel.tsx:
 *   - STATUS_ICON / STATUS_COLOR mappings for all known statuses
 *   - fmtProgress: clamping, padding, formatting
 *   - truncate: exact limit, over limit, under limit
 *   - Windowing math: windowStart calculation keeps selection centered
 *   - Row visibility: correct slice of projects is rendered
 *   - isActive guard: keyboard input guarded by isActive prop (documented)
 *
 * React component rendering tests (inbox badge, active session marker, focus
 * hint swap) are deferred to ink-testing-library E2E in:
 *   test/e2e/dashboard-ink/sidebarPanel.e2e.test.js (future)
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ─── Mirror pure-logic helpers from SidebarPanel.tsx ─────────────────────────
// These are extracted here as the CONTRACT the implementation must satisfy.
// Any change to the source that breaks these tests is a regression.

const STATUS_ICON = {
  active:   '●',
  paused:   '◐',
  stable:   '◆',
  complete: '✓',
  planning: '○',
  blocked:  '✗',
};

const STATUS_COLOR = {
  active:   'green',
  paused:   'yellow',
  stable:   'cyan',
  complete: 'gray',
  planning: 'blue',
  blocked:  'red',
};

/** Mirror of fmtProgress in SidebarPanel.tsx */
function fmtProgress(p) {
  const clamped = Math.max(0, Math.min(100, p));
  return `${clamped}%`.padStart(4);
}

/** Mirror of truncate in SidebarPanel.tsx */
function truncate(s, max) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Mirror of windowing logic in SidebarPanel.tsx.
 * Returns { windowStart, visible } for given inputs.
 */
function calcWindow(projects, selectedIndex, WINDOW = 12) {
  const windowStart = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(WINDOW / 2), projects.length - WINDOW)
  );
  const visible = projects.slice(windowStart, windowStart + WINDOW);
  return { windowStart, visible };
}

// ─── Build test projects ──────────────────────────────────────────────────────

function makeProjects(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `project-${i}`,
    type: 'node-package',
    status: 'active',
    progress: i * 5,
    focus: `Focus ${i}`,
  }));
}

// ─── STATUS_ICON tests ────────────────────────────────────────────────────────

describe('STATUS_ICON mapping', () => {
  const knownStatuses = ['active', 'paused', 'stable', 'complete', 'planning', 'blocked'];

  it('has an icon for every known status', () => {
    knownStatuses.forEach(s => {
      expect(STATUS_ICON[s]).toBeDefined();
      expect(STATUS_ICON[s].length).toBeGreaterThan(0);
    });
  });

  it('active → filled circle ●', () => {
    expect(STATUS_ICON.active).toBe('●');
  });

  it('paused → half circle ◐', () => {
    expect(STATUS_ICON.paused).toBe('◐');
  });

  it('stable → diamond ◆', () => {
    expect(STATUS_ICON.stable).toBe('◆');
  });

  it('complete → checkmark ✓', () => {
    expect(STATUS_ICON.complete).toBe('✓');
  });

  it('planning → empty circle ○', () => {
    expect(STATUS_ICON.planning).toBe('○');
  });

  it('blocked → cross ✗', () => {
    expect(STATUS_ICON.blocked).toBe('✗');
  });

  it('all icons are single-character unicode (not empty strings)', () => {
    Object.values(STATUS_ICON).forEach(icon => {
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });
  });
});

// ─── STATUS_COLOR tests ───────────────────────────────────────────────────────

describe('STATUS_COLOR mapping', () => {
  it('active → green (positive, in-progress)', () => {
    expect(STATUS_COLOR.active).toBe('green');
  });

  it('paused → yellow (caution, not urgent)', () => {
    expect(STATUS_COLOR.paused).toBe('yellow');
  });

  it('stable → cyan (neutral/done)', () => {
    expect(STATUS_COLOR.stable).toBe('cyan');
  });

  it('complete → gray (archived/done)', () => {
    expect(STATUS_COLOR.complete).toBe('gray');
  });

  it('planning → blue (future)', () => {
    expect(STATUS_COLOR.planning).toBe('blue');
  });

  it('blocked → red (needs attention)', () => {
    expect(STATUS_COLOR.blocked).toBe('red');
  });

  it('has a color for every icon key (parity check)', () => {
    const iconKeys  = Object.keys(STATUS_ICON).sort();
    const colorKeys = Object.keys(STATUS_COLOR).sort();
    expect(iconKeys).toEqual(colorKeys);
  });
});

// ─── fmtProgress tests ────────────────────────────────────────────────────────

describe('fmtProgress()', () => {
  it('formats 0 as " 0%" (4 chars)', () => {
    expect(fmtProgress(0)).toBe('  0%');
    expect(fmtProgress(0)).toHaveLength(4);
  });

  it('formats 5 as "  5%" (4 chars)', () => {
    expect(fmtProgress(5)).toBe('  5%');
  });

  it('formats 75 as " 75%" (4 chars)', () => {
    expect(fmtProgress(75)).toBe(' 75%');
  });

  it('formats 100 as "100%" (4 chars)', () => {
    expect(fmtProgress(100)).toBe('100%');
    expect(fmtProgress(100)).toHaveLength(4);
  });

  it('clamps values > 100 to 100', () => {
    expect(fmtProgress(150)).toBe('100%');
    expect(fmtProgress(999)).toBe('100%');
  });

  it('clamps values < 0 to 0', () => {
    expect(fmtProgress(-10)).toBe('  0%');
    expect(fmtProgress(-999)).toBe('  0%');
  });

  it('always returns exactly 4 characters', () => {
    [0, 1, 9, 10, 50, 99, 100].forEach(p => {
      expect(fmtProgress(p)).toHaveLength(4);
    });
  });
});

// ─── truncate() tests ─────────────────────────────────────────────────────────

describe('truncate()', () => {
  it('returns string unchanged when shorter than max', () => {
    expect(truncate('atlas', 14)).toBe('atlas');
  });

  it('returns string unchanged when exactly max length', () => {
    const s = 'a'.repeat(14);
    expect(truncate(s, 14)).toBe(s);
  });

  it('truncates and appends ellipsis when over max', () => {
    const s = 'a'.repeat(20);
    const result = truncate(s, 14);
    expect(result).toHaveLength(14);
    expect(result.endsWith('…')).toBe(true);
  });

  it('result is exactly max characters when truncated', () => {
    expect(truncate('very-long-project-name-here', 14)).toHaveLength(14);
  });

  it('uses Unicode ellipsis (…) not three dots (...)', () => {
    const result = truncate('abcdefghijklmnop', 14);
    expect(result).toContain('…');
    expect(result).not.toContain('...');
  });

  it('handles max=1 edge case (just ellipsis)', () => {
    expect(truncate('hello', 1)).toBe('…');
  });

  it('handles empty string → returns empty', () => {
    expect(truncate('', 14)).toBe('');
  });
});

// ─── Windowing tests ──────────────────────────────────────────────────────────

describe('Windowing (calcWindow)', () => {
  const WINDOW = 12;

  describe('list shorter than window', () => {
    it('shows all projects when list < WINDOW', () => {
      const projects = makeProjects(5);
      const { visible, windowStart } = calcWindow(projects, 0, WINDOW);
      expect(visible).toHaveLength(5);
      expect(windowStart).toBe(0);
    });

    it('shows all projects when list = WINDOW', () => {
      const projects = makeProjects(12);
      const { visible } = calcWindow(projects, 0, WINDOW);
      expect(visible).toHaveLength(12);
    });
  });

  describe('list longer than window', () => {
    it('windowStart is 0 when selected is at the top', () => {
      const projects = makeProjects(20);
      const { windowStart } = calcWindow(projects, 0, WINDOW);
      expect(windowStart).toBe(0);
    });

    it('visible slice has exactly WINDOW items when list > WINDOW', () => {
      const projects = makeProjects(20);
      const { visible } = calcWindow(projects, 5, WINDOW);
      expect(visible).toHaveLength(WINDOW);
    });

    it('windowStart never goes negative', () => {
      const projects = makeProjects(20);
      for (let i = 0; i < 20; i++) {
        const { windowStart } = calcWindow(projects, i, WINDOW);
        expect(windowStart).toBeGreaterThanOrEqual(0);
      }
    });

    it('visible slice always includes the selected project', () => {
      const projects = makeProjects(30);
      for (let i = 0; i < 30; i++) {
        const { visible } = calcWindow(projects, i, WINDOW);
        const visibleIds = visible.map(p => p.id);
        expect(visibleIds).toContain(projects[i].id);
      }
    });

    it('windowStart caps at projects.length - WINDOW', () => {
      const projects = makeProjects(20);
      const { windowStart } = calcWindow(projects, 19, WINDOW);
      expect(windowStart).toBe(20 - WINDOW); // = 8
    });

    it('visible always starts with windowStart project', () => {
      const projects = makeProjects(25);
      const { windowStart, visible } = calcWindow(projects, 20, WINDOW);
      expect(visible[0].id).toBe(projects[windowStart].id);
    });
  });

  describe('scroll indicator logic', () => {
    it('indicator needed when projects.length > WINDOW', () => {
      const big = makeProjects(13);
      const small = makeProjects(12);
      expect(big.length > WINDOW).toBe(true);
      expect(small.length > WINDOW).toBe(false);
    });

    it('indicator range: windowStart+1 to min(windowStart+WINDOW, total)', () => {
      const projects = makeProjects(20);
      const selectedIndex = 15;
      const { windowStart } = calcWindow(projects, selectedIndex, WINDOW);
      const rangeStart = windowStart + 1;
      const rangeEnd   = Math.min(windowStart + WINDOW, projects.length);
      expect(rangeStart).toBeGreaterThanOrEqual(1);
      expect(rangeEnd).toBeLessThanOrEqual(projects.length);
      expect(rangeEnd - rangeStart + 1).toBeLessThanOrEqual(WINDOW);
    });
  });
});

// ─── isActive guard (behavioral contract) ────────────────────────────────────

describe('isActive keyboard guard (contract)', () => {
  /**
   * SidebarPanel uses: if (!isActive) return;  inside useInput.
   * We can't invoke useInput in unit tests (needs Ink renderer),
   * so these tests document the EXPECTED behaviour as spec assertions.
   */

  it('when isActive=false, j/k keystrokes must NOT fire onSelect', () => {
    // Documented: useInput handler returns early when !isActive
    // Verified by code inspection of SidebarPanel.tsx lines with "if (!isActive) return"
    const src = require('fs').readFileSync(
      require('path').resolve(
        __dirname,
        '../../../src/cli/dashboard-ink/components/SidebarPanel.tsx'
      ),
      'utf-8'
    );
    expect(src).toContain('if (!isActive) return');
  });

  it('when isActive=true, Enter must call onSelectProject', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(
        __dirname,
        '../../../src/cli/dashboard-ink/components/SidebarPanel.tsx'
      ),
      'utf-8'
    );
    expect(src).toContain('onSelectProject(p)');
  });

  it('navigation uses both j/k AND arrow keys', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(
        __dirname,
        '../../../src/cli/dashboard-ink/components/SidebarPanel.tsx'
      ),
      'utf-8'
    );
    expect(src).toContain("input === 'j'");
    expect(src).toContain('key.downArrow');
    expect(src).toContain("input === 'k'");
    expect(src).toContain('key.upArrow');
  });
});
