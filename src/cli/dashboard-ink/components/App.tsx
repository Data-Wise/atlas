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
import { Box, Text } from 'ink';
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
import { ThemeProvider } from '../lib/ThemeContext.js';
import { useProjects } from '../hooks/useProjects.js';
import { useActiveSession } from '../hooks/useActiveSession.js';

// Mock breadcrumbs for the inspector (would come from atlas.context.trail() in production)
const MOCK_CRUMBS = [
  'wiring App.tsx — Tab/Shift+Tab tested, panels visible',
  'InspectorPanel timer resets correctly on session change',
  'SidebarPanel windowing: 12-row limit verified',
];

// Mock heatmap grid (7 rows × 13 cols) — would come from formatHeatmapGrid(dailyBreakdown) in production
function generateMockHeatmapGrid(): Array<Array<{ date: string; value: number; level: number }>> {
  const grid: Array<Array<{ date: string; value: number; level: number }>> = [];
  for (let row = 0; row < 7; row++) {
    const cols: Array<{ date: string; value: number; level: number }> = [];
    for (let col = 0; col < 13; col++) {
      // Simulate increasing activity towards recent weeks
      const base = Math.random() * (col / 13) * 4;
      const level = Math.min(4, Math.round(base));
      cols.push({ date: '', value: level * 15, level });
    }
    grid.push(cols);
  }
  return grid;
}
const MOCK_HEATMAP_GRID = generateMockHeatmapGrid();

// ─── App ──────────────────────────────────────────────────────────────────────

export const App: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // ── Real data hooks ─────────────────────────────────────────────────────────
  const { projects, loading, error } = useProjects();
  const { projectName: activeProjectName, elapsed: sessionSeconds, isActive: hasActiveSession } = useActiveSession();

  // Derive activeProjectId from the active session's project name
  const activeProjectId = hasActiveSession
    ? projects.find(p => p.name === activeProjectName)?.id ?? null
    : null;

  // ── State machine ──────────────────────────────────────────────────────────
  const [stateMachine] = useState(() => createStateMachine({ initial: STATES.BROWSE }));
  const [currentView, setCurrentView] = useState<string>(STATES.BROWSE);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
    setSelectedProject(projects[idx] ?? null);
  };

  // ── Current view renderer ─────────────────────────────────────────────────
  const renderCurrentView = () => {
    switch (currentView) {
      case STATES.PLAN:
        return <PlanView onBack={showMainView} onQuit={onExit} onStartSession={showFocusView} />;

      case STATES.ECOSYSTEM:
        return <EcosystemView onBack={showMainView} onQuit={onExit} onSelectProject={showDetailView} onFocus={showFocusView} heatmapGrid={MOCK_HEATMAP_GRID} streakDays={4} totalSessions={23} />;

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
        if (loading && projects.length === 0) {
          return <Box padding={1}><Text dimColor>Loading projects...</Text></Box>;
        }
        return (
          <MainView
            projects={projects}
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
    <ThemeProvider>
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
                      projects={projects}
                      selectedIndex={sidebarIndex}
                      onSelect={handleSidebarIndexChange}
                      onSelectProject={handleSidebarSelect}
                      isActive={sidebar.isActive}
                      pendingCaptures={2}                    // mock: 2 inbox items (Increment 4)
                      activeProjectId={activeProjectId}
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
                      sessionSeconds={sessionSeconds}
                      pomodoroLength={25}
                      breadcrumbs={MOCK_CRUMBS}
                      heatmapGrid={MOCK_HEATMAP_GRID}
                      streakDays={4}
                      totalSessions={23}
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
    </ThemeProvider>
  );
};
