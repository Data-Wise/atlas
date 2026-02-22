/**
 * App.tsx — Root Component for the Atlas Ink Dashboard (v0.9.1)
 *
 * Responsibilities:
 *   1. State machine: manages views (BROWSE / DETAIL / FOCUS / ZEN / TIMELINE / ECOSYSTEM / PLAN)
 *   2. Layout engine: wraps views in LayoutManager (SINGLE / SPLIT / TRIPLE)
 *      - Tab    → cycle layout mode
 *      - Shift+Tab → cycle panel focus
 *   3. Data: provides project list + selected project to side panels
 *   4. Sidebar sync: sidebar selection updates the main panel's selected project
 *
 * Component tree (in TRIPLE mode):
 *   App
 *   └─ LayoutManager (row, widths from PANEL_CONFIG)
 *      ├─ SidebarPanel  (25%)  — compact project list
 *      ├─ [current view]  (47%)  — MainView / DetailView / FocusView …
 *      └─ InspectorPanel (28%)  — detail + Pomodoro timer
 */

import React, { useState } from 'react';
import { Box } from 'ink';
import { MainView }     from './views/MainView.js';
import { DetailView }   from './views/DetailView.js';
import { FocusView }    from './views/FocusView.js';
import { ZenView }      from './views/ZenView.js';
import { TimelineView } from './views/TimelineView.js';
import { EcosystemView } from './views/EcosystemView.js';
import { PlanView }     from './views/PlanView.js';
import { createStateMachine, STATES } from '../lib/stateMachine.js';
import { useLayout, LayoutManager, LayoutStatusBar, LAYOUT } from '../lib/LayoutManager.js';
import { SidebarPanel }   from './SidebarPanel.js';
import { InspectorPanel } from './InspectorPanel.js';
import type { Project } from '../types.js';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'atlas',
    type: 'node-package',
    status: 'active',
    progress: 100,
    focus: 'v0.9.1 Multi-Panel Dashboard',
    path: '/Users/dt/projects/dev-tools/atlas',
    next: 'Wire panels into App.tsx, Run integration tests',
  },
  {
    id: '2',
    name: 'flow-cli',
    type: 'zsh-package',
    status: 'stable',
    progress: 95,
    focus: 'Maintenance mode',
    path: '/Users/dt/projects/dev-tools/flow-cli',
  },
  {
    id: '3',
    name: 'mcp-server-statistical-research',
    type: 'mcp-server',
    status: 'active',
    progress: 80,
    focus: 'Add Zotero integration',
    path: '/Users/dt/projects/dev-tools/mcp-servers/statistical-research',
    next: 'Implement citation endpoint',
  },
  {
    id: '4',
    name: 'rmediation',
    type: 'r-package',
    status: 'paused',
    progress: 60,
    focus: 'CRAN submission prep',
    path: '/Users/dt/projects/r-packages/rmediation',
    next: 'Complete documentation, Add vignette',
  },
  {
    id: '5',
    name: 'causal-inference',
    type: 'teaching',
    status: 'active',
    progress: 45,
    focus: 'Week 3 lecture materials',
    path: '/Users/dt/projects/teaching/causal-inference',
    next: 'Record lecture video',
  },
];

// Mock breadcrumbs for the inspector (would come from atlas.context.trail() in production)
const MOCK_CRUMBS = [
  'wiring App.tsx — Tab/Shift+Tab tested, panels visible',
  'InspectorPanel timer resets correctly on session change',
  'SidebarPanel windowing: 12-row limit verified',
];

// ─── App ──────────────────────────────────────────────────────────────────────

export const App: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // ── State machine ──────────────────────────────────────────────────────────
  const [stateMachine] = useState(() => createStateMachine({ initial: STATES.BROWSE }));
  const [currentView, setCurrentView] = useState<string>(STATES.BROWSE);
  const [selectedProject, setSelectedProject] = useState<Project | null>(MOCK_PROJECTS[0]);

  // ── Layout hook (Tab cycles modes, Shift+Tab cycles focus) ────────────────
  const {
    layout,
    focusPanel,
    renderProps,
  } = useLayout({ initial: LAYOUT.SINGLE });

  // ── Sidebar controlled selection ──────────────────────────────────────────
  const [sidebarIndex, setSidebarIndex] = useState(0);

  // ── View transitions (state machine is authoritative) ─────────────────────
  const showMainView = () => {
    const ok = stateMachine.transition(STATES.BROWSE);
    if (ok) {
      setCurrentView(STATES.BROWSE);
    }
  };

  const showDetailView = (project: Project) => {
    const ok = stateMachine.transition(STATES.DETAIL, { project });
    if (ok) {
      setCurrentView(STATES.DETAIL);
      setSelectedProject(project);
    }
  };

  const showFocusView = () => {
    const ok = stateMachine.transition(STATES.FOCUS);
    if (ok) {
      setCurrentView(STATES.FOCUS);
    }
  };

  const showZenView = () => {
    const ok = stateMachine.transition(STATES.ZEN);
    if (ok) {
      setCurrentView(STATES.ZEN);
    }
  };

  const showTimelineView = () => {
    const ok = stateMachine.transition(STATES.TIMELINE);
    if (ok) {
      setCurrentView(STATES.TIMELINE);
    }
  };

  const showEcosystemView = () => {
    const ok = stateMachine.transition(STATES.ECOSYSTEM);
    if (ok) {
      setCurrentView(STATES.ECOSYSTEM);
    }
  };

  const showPlanView = () => {
    const ok = stateMachine.transition(STATES.PLAN);
    if (ok) {
      setCurrentView(STATES.PLAN);
    }
  };

  // ── Sidebar → main panel sync ──────────────────────────────────────────────
  const handleSidebarSelect = (project: Project) => {
    setSelectedProject(project);
    // Only navigate to detail if we're currently browsing (don't interrupt focus/timeline etc.)
    if (currentView === STATES.BROWSE) {
      showDetailView(project);
    }
  };

  const handleSidebarIndexChange = (idx: number) => {
    setSidebarIndex(idx);
    // Keep inspector in sync even without Enter
    setSelectedProject(MOCK_PROJECTS[idx] ?? null);
  };

  // ── Current view renderer ─────────────────────────────────────────────────
  const renderCurrentView = () => {
    switch (currentView) {
      case STATES.PLAN:
        return <PlanView onBack={showMainView} onQuit={onExit} onStartSession={showFocusView} />;

      case STATES.ECOSYSTEM:
        return <EcosystemView onBack={showMainView} onQuit={onExit} onSelectProject={showDetailView} onFocus={showFocusView} />;

      case STATES.TIMELINE:
        return <TimelineView onBack={showMainView} onQuit={onExit} onFocus={showFocusView} />;

      case STATES.ZEN:
        return <ZenView project={selectedProject?.name} task={selectedProject?.focus} onBack={showMainView} />;

      case STATES.FOCUS:
        return <FocusView project={selectedProject?.name} task={selectedProject?.focus} onBack={showMainView} />;

      case STATES.DETAIL:
        return selectedProject
          ? <DetailView project={selectedProject} onBack={showMainView} />
          : null;

      case STATES.BROWSE:
      default:
        return (
          <MainView
            projects={MOCK_PROJECTS}
            onQuit={onExit}
            onSelectProject={showDetailView}
            onFocus={showFocusView}
            onZen={showZenView}
            onTimeline={showTimelineView}
            onEcosystem={showEcosystemView}
            onPlan={showPlanView}
          />
        );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" width="100%" height="100%">

      {/* Main content area — LayoutManager handles SINGLE / SPLIT / TRIPLE */}
      <Box flexGrow={1}>
        <LayoutManager layout={layout} focusPanel={focusPanel}>
          {({ sidebar, main, inspector }) => (
            <>
              {/* Left panel: project list (SPLIT + TRIPLE only) */}
              {sidebar && (
                <Box width={`${sidebar.widthPct}%`} height="100%">
                  <SidebarPanel
                    projects={MOCK_PROJECTS}
                    selectedIndex={sidebarIndex}
                    onSelect={handleSidebarIndexChange}
                    onSelectProject={handleSidebarSelect}
                    isActive={sidebar.isActive}
                    pendingCaptures={2}                    // mock: 2 inbox items
                    activeProjectId={MOCK_PROJECTS[0].id} // mock: atlas has active session
                  />
                </Box>
              )}

              {/* Center panel: current view */}
              <Box width={`${main.widthPct}%`} height="100%">
                {renderCurrentView()}
              </Box>

              {/* Right panel: inspector + Pomodoro (TRIPLE only) */}
              {inspector && (
                <Box width={`${inspector.widthPct}%`} height="100%">
                  <InspectorPanel
                    project={selectedProject ?? undefined}
                    isActive={inspector.isActive}
                    sessionSeconds={300}        // mock: 5 min into session
                    pomodoroLength={25}
                    breadcrumbs={MOCK_CRUMBS}
                  />
                </Box>
              )}
            </>
          )}
        </LayoutManager>
      </Box>

      {/* Command bar — LayoutStatusBar at the right end */}
      <Box paddingX={1} justifyContent="flex-end">
        <LayoutStatusBar layout={layout} focusPanel={focusPanel} />
      </Box>

    </Box>
  );
};
