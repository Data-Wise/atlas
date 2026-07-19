/**
 * App.tsx Integration Tests (v0.14 3-view consolidation)
 *
 * Source-contract tests for the wired App.tsx. We can't render Ink
 * components in pure Jest (no TTY), so these tests:
 *   1. Parse source text to verify the import graph is correct
 *   2. Verify the 3-view switch (NOW/TIMER/PLAN) is wired
 *   3. Verify the global keymap dispatch (1/2/3, n/t/p, ?, q)
 *   4. Verify real data hooks integration
 *
 * Full render tests belong in ink-testing-library E2E (test/e2e/dashboard-ink/).
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require1 = createRequire(import.meta.url);

const fs   = require1('fs');
const path = require1('path');
const testFilePath = fileURLToPath(import.meta.url);
const testDirPath = path.dirname(testFilePath);

const APP_SRC = path.resolve(
  testDirPath,
  '../../../src/cli/dashboard-ink/components/App.tsx'
);

let src;
beforeAll(() => {
  src = fs.readFileSync(APP_SRC, 'utf-8');
});

// ─── 1. Import graph ──────────────────────────────────────────────────────────

describe('App.tsx import graph', () => {
  it('imports the 3 consolidated views', () => {
    expect(src).toContain("import { NowView }   from './views/NowView.js'");
    expect(src).toContain("import { TimerView } from './views/TimerView.js'");
    expect(src).toContain("import { PlanView }  from './views/PlanView.js'");
  });

  it('imports the HelpOverlay component', () => {
    expect(src).toContain("import { HelpOverlay } from './HelpOverlay.js'");
  });

  it('imports createStateMachine and STATES', () => {
    expect(src).toContain('createStateMachine');
    expect(src).toContain('STATES');
  });

  it('imports useLayout and LayoutManager', () => {
    expect(src).toContain('useLayout');
    expect(src).toContain('LayoutManager');
  });

  it('does not import any of the 8 pre-consolidation view/panel components', () => {
    const removed = [
      'MainView', 'DetailView', 'FocusView', 'ZenView',
      'TimelineView', 'EcosystemView', 'AnalyticsView',
      'InspectorPanel', 'SidebarPanel',
    ];
    removed.forEach(name => {
      expect(src).not.toContain(`import { ${name} }`);
    });
  });
});

// ─── 2. State machine wiring (3 states) ──────────────────────────────────────

describe('3-state machine wiring in App.tsx', () => {
  it('initializes state machine with STATES.NOW', () => {
    expect(src).toContain('createStateMachine({ initial: STATES.NOW })');
  });

  it('defines showNow / showTimer / showPlan transition helpers', () => {
    expect(src).toContain('showNow');
    expect(src).toContain('showTimer');
    expect(src).toContain('showPlan');
  });

  it('switches on exactly the 3 states in renderCurrentView', () => {
    expect(src).toContain('case STATES.TIMER:');
    expect(src).toContain('case STATES.PLAN:');
    expect(src).toContain('case STATES.NOW:');
  });
});

// ─── 3. Global keymap dispatch ────────────────────────────────────────────────

describe('Global keymap dispatch (lib/keymap.ts scope "global")', () => {
  it('1/n switches to Now', () => {
    expect(src).toContain("input === '1' || input === 'n'");
  });

  it('2/t switches to Timer', () => {
    expect(src).toContain("input === '2' || input === 't'");
  });

  it('3/p switches to Plan', () => {
    expect(src).toContain("input === '3' || input === 'p'");
  });

  it('? toggles the help overlay', () => {
    expect(src).toContain("input === '?'");
    expect(src).toContain('setShowHelp');
  });
});

// ─── 4. Real data hooks integration ──────────────────────────────────────────

describe('Real data hooks integration', () => {
  it('imports useProjects hook', () => {
    expect(src).toContain('useProjects');
  });

  it('calls useProjects() for project data', () => {
    expect(src).toContain('useProjects()');
  });

  it('uses useProjectStats for real stats data', () => {
    expect(src).toContain('useProjectStats');
  });

  it('shows loading state when projects are being fetched', () => {
    expect(src).toContain('Loading projects');
  });
});

// ─── 5. NowView wiring ────────────────────────────────────────────────────────

describe('NowView wiring in App.tsx', () => {
  it('passes projects, selectedProject, and selection handlers', () => {
    expect(src).toContain('projects={projects}');
    expect(src).toContain('selectedProject={selectedProject}');
    expect(src).toContain('onSelectedIndexChange={handleSidebarIndexChange}');
  });

  it('passes heatmap + stats data through', () => {
    expect(src).toContain('heatmapGrid={projectStats.heatmapGrid}');
    expect(src).toContain('streakDays={projectStats.streakDays}');
  });
});
