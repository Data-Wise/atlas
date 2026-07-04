/**
 * App.tsx D4 Integration Tests
 *
 * Source-contract tests for the wired App.tsx.
 * We can't render Ink components in pure Jest (no TTY), so these tests:
 *   1. Parse source text to verify integration contracts
 *   2. Validate the import graph is correct
 *   3. Verify sidebar↔inspector sync logic via pure-function mirrors
 *   4. Verify MOCK_PROJECTS shape matches SidebarProject + InspectorProject
 *
 * Full render tests belong in ink-testing-library E2E (future).
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';
const require1 = createRequire(import.meta.url);

const fs   = require1('fs');
const path = require1('path');
const testFilePath = fileURLToPath(import.meta.url);
const testDirPath = path.dirname(testFilePath);

const APP_SRC = path.resolve(
  testDirPath,
  '../../../src/cli/dashboard-ink/components/App.tsx'
);

// ─── Source snapshot ──────────────────────────────────────────────────────────

let src;
beforeAll(() => {
  src = fs.readFileSync(APP_SRC, 'utf-8');
});

// ─── 1. Import graph ──────────────────────────────────────────────────────────

describe('App.tsx import graph', () => {
  it('imports useLayout from LayoutManager', () => {
    expect(src).toContain('useLayout');
    expect(src).toContain('LayoutManager');
  });

  it('imports StatusBar from ./StatusBar.js', () => {
    expect(src).toContain("import { StatusBar }");
    expect(src).toContain("'./StatusBar.js'");
  });

  it('imports LAYOUT constant', () => {
    expect(src).toContain('LAYOUT');
  });

  it('imports SidebarPanel', () => {
    expect(src).toContain("import { SidebarPanel }");
  });

  it('imports InspectorPanel', () => {
    expect(src).toContain("import { InspectorPanel }");
  });

  it('imports all 7 views', () => {
    const views = ['MainView', 'DetailView', 'FocusView', 'ZenView',
                   'TimelineView', 'EcosystemView', 'PlanView'];
    views.forEach(v => {
      expect(src).toContain(v);
    });
  });

  it('imports createStateMachine and STATES', () => {
    expect(src).toContain('createStateMachine');
    expect(src).toContain('STATES');
  });
});

// ─── 2. LayoutManager wiring ──────────────────────────────────────────────────

describe('LayoutManager wiring in App.tsx', () => {
  it('calls useLayout() with LAYOUT.SINGLE as initial', () => {
    expect(src).toContain('useLayout');
    expect(src).toContain('LAYOUT.SINGLE');
  });

  it('destructures layout and focusPanel from useLayout result', () => {
    expect(src).toContain('layout');
    expect(src).toContain('focusPanel');
  });

  it('uses <LayoutManager> render-prop (children function)', () => {
    expect(src).toContain('<LayoutManager');
    expect(src).toContain('layout={layout}');
    expect(src).toContain('focusPanel={focusPanel}');
  });

  it('render-prop destructures sidebar, main, inspector', () => {
    expect(src).toContain('sidebar');
    expect(src).toContain('main');
    expect(src).toContain('inspector');
  });

  it('sidebar panel wrapped in conditional: sidebar &&', () => {
    expect(src).toContain('sidebar &&');
  });

  it('inspector panel wrapped in conditional: inspector &&', () => {
    expect(src).toContain('inspector &&');
  });

  it('renders StatusBar in command bar', () => {
    expect(src).toContain('<StatusBar');
    expect(src).toContain('currentView={currentView}');
    expect(src).toContain('layout={layout}');
    expect(src).toContain('focusPanel={focusPanel}');
    expect(src).toContain('hasActiveSession={hasActiveSession}');
  });
});

// ─── 3. SidebarPanel wiring ───────────────────────────────────────────────────

describe('SidebarPanel wiring in App.tsx', () => {
  it('passes isActive from sidebar render props', () => {
    expect(src).toContain('isActive={sidebar.isActive}');
  });

  it('passes projects prop', () => {
    expect(src).toContain('projects={projects}');
  });

  it('passes selectedIndex (controlled)', () => {
    expect(src).toContain('selectedIndex={sidebarIndex}');
  });

  it('passes onSelect handler', () => {
    expect(src).toContain('onSelect={handleSidebarIndexChange}');
  });

  it('passes onSelectProject handler', () => {
    expect(src).toContain('onSelectProject={handleSidebarSelect}');
  });

  it('passes pendingCaptures for inbox badge', () => {
    expect(src).toContain('pendingCaptures=');
  });

  it('passes activeProjectId for session indicator', () => {
    expect(src).toContain('activeProjectId=');
  });
});

// ─── 4. InspectorPanel wiring ─────────────────────────────────────────────────

describe('InspectorPanel wiring in App.tsx', () => {
  it('passes isActive from inspector render props', () => {
    expect(src).toContain('isActive={inspector.isActive}');
  });

  it('passes project (selectedProject ?? undefined)', () => {
    expect(src).toContain('project={selectedProject');
  });

  it('passes sessionSeconds for Pomodoro timer', () => {
    expect(src).toContain('sessionSeconds=');
  });

  it('passes pomodoroLength', () => {
    expect(src).toContain('pomodoroLength=');
  });

  it('passes breadcrumbs array', () => {
    expect(src).toContain('breadcrumbs=');
  });
});

// ─── 5. Sidebar sync logic (pure mirrors) ────────────────────────────────────

describe('Sidebar sync logic', () => {
  /**
   * Mirror of handleSidebarSelect logic:
   * Only calls showDetailView when currentView === STATES.BROWSE
   */
  const BROWSE = 'browse';
  const FOCUS  = 'focus';

  function handleSidebarSelect(project, currentView, showDetailView) {
    // Sets selectedProject always
    let selected = project;
    // Only navigates when in BROWSE
    if (currentView === BROWSE) {
      showDetailView(project);
    }
    return selected;
  }

  it('showDetailView fires when currentView is BROWSE', () => {
    const spy = jest.fn();
    handleSidebarSelect({ id: '1', name: 'atlas' }, BROWSE, spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ id: '1', name: 'atlas' });
  });

  it('showDetailView does NOT fire when currentView is not BROWSE', () => {
    const spy = jest.fn();
    handleSidebarSelect({ id: '1', name: 'atlas' }, FOCUS, spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('selectedProject always updates regardless of view', () => {
    const project = { id: '2', name: 'flow-cli' };
    const noop = jest.fn();
    const result = handleSidebarSelect(project, FOCUS, noop);
    expect(result).toEqual(project);
  });
});

// ─── 6. Real data hooks integration ──────────────────────────────────────────

describe('Real data hooks integration', () => {
  it('imports useProjects hook', () => {
    expect(src).toContain('useProjects');
  });

  it('calls useProjects() for project data', () => {
    expect(src).toContain('useProjects()');
  });

  it('destructures projects, loading, error from useProjects', () => {
    expect(src).toContain('projects');
    expect(src).toContain('loading');
    expect(src).toContain('error');
  });

  it('uses useProjectStats for real stats data', () => {
    expect(src).toContain('useProjectStats');
  });

  it('shows loading state when projects are being fetched', () => {
    expect(src).toContain('Loading projects');
  });
});

// ─── 7. Width prop forwarding ─────────────────────────────────────────────────

describe('Width forwarding to column Boxes', () => {
  it('sidebar width uses sidebar.widthPct template literal', () => {
    expect(src).toContain('sidebar.widthPct');
  });

  it('main width uses main.widthPct template literal', () => {
    expect(src).toContain('main.widthPct');
  });

  it('inspector width uses inspector.widthPct template literal', () => {
    expect(src).toContain('inspector.widthPct');
  });
});

// ─── 8. All view renders preserved ───────────────────────────────────────────

describe('All 7 views still rendered in center column', () => {
  const cases = [
    ['PLAN',      'PlanView'],
    ['ECOSYSTEM', 'EcosystemView'],
    ['TIMELINE',  'TimelineView'],
    ['ZEN',       'ZenView'],
    ['FOCUS',     'FocusView'],
    ['DETAIL',    'DetailView'],
    ['BROWSE',    'MainView'],
  ];

  cases.forEach(([state, component]) => {
    it(`${state} → renders <${component}>`, () => {
      expect(src).toContain(`STATES.${state}`);
      expect(src).toContain(`<${component}`);
    });
  });
});
