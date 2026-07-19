/**
 * App.tsx — Root Component for the Atlas Ink Dashboard
 *
 * v0.14 consolidation (SPEC-tui-consolidation-2026-07-19.md): 8 views -> 3.
 *
 * Responsibilities:
 *   1. State machine: manages 3 views (NOW / TIMER / PLAN)
 *   2. Layout engine: wraps views in LayoutManager (SINGLE / SPLIT / TRIPLE)
 *      - Tab       -> cycle layout mode
 *      - Shift+Tab -> cycle panel focus
 *   3. Data: provides project list + selected project to the current view
 *   4. Global key dispatch (lib/keymap.ts, scope 'global'): 1/2/3 or n/t/p
 *      switch views, ? toggles the help overlay, q quits.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { NowView }   from './views/NowView.js';
import { TimerView } from './views/TimerView.js';
import { PlanView }  from './views/PlanView.js';
import { HelpOverlay } from './HelpOverlay.js';
import { createStateMachine, STATES } from '../lib/stateMachine.js';
import { useLayout, LayoutManager } from '../lib/LayoutManager.js';
import { StatusBar } from './StatusBar.js';
import type { Project } from '../types.js';
import { ThemeProvider } from '../lib/ThemeContext.js';
import { useProjects } from '../hooks/useProjects.js';
import { useActiveSession } from '../hooks/useActiveSession.js';
import { useProjectStats } from '../hooks/useProjectStats.js';
import { usePendingCaptures } from '../hooks/usePendingCaptures.js';

// ─── App ──────────────────────────────────────────────────────────────────────

export const App: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // ── Real data hooks ─────────────────────────────────────────────────────────
  const { projects, loading } = useProjects();
  const { projectName: activeProjectName, elapsed: sessionSeconds, isActive: hasActiveSession } = useActiveSession();

  const activeProjectId = hasActiveSession
    ? projects.find(p => p.name === activeProjectName)?.id ?? null
    : null;

  // ── State machine (NOW / TIMER / PLAN) ─────────────────────────────────────
  const [stateMachine] = useState(() => createStateMachine({ initial: STATES.NOW }));
  const [currentView, setCurrentView] = useState<string>(STATES.NOW);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects]);

  const projectStats = useProjectStats(selectedProject?.id ?? null);
  const { count: pendingCaptures } = usePendingCaptures();

  const { layout, focusPanel, renderProps } = useLayout({ initial: 'single' as const });

  const [sidebarIndex, setSidebarIndex] = useState(0);

  const goTo = (state: typeof STATES[keyof typeof STATES]) => {
    const ok = stateMachine.transition(state);
    if (ok) setCurrentView(state);
  };

  const showNow = () => goTo(STATES.NOW);
  const showTimer = () => goTo(STATES.TIMER);
  const showPlan = () => goTo(STATES.PLAN);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleSidebarIndexChange = (idx: number) => {
    setSidebarIndex(idx);
    setSelectedProject(projects[idx] ?? null);
  };

  const handleSelectProjectById = (id: string) => {
    const p = projects.find(x => x.id === id) ?? null;
    setSelectedProject(p);
  };

  // ── Global key dispatch (lib/keymap.ts scope 'global') ─────────────────────
  useInput((input) => {
    if (input === '?') {
      setShowHelp(h => !h);
      return;
    }
    if (showHelp) {
      if (input === 'q') onExit();
      return; // help overlay swallows all other input until closed
    }
    if (input === '1' || input === 'n') {
      showNow();
    } else if (input === '2' || input === 't') {
      showTimer();
    } else if (input === '3' || input === 'p') {
      showPlan();
    }
  });

  const renderCurrentView = () => {
    switch (currentView) {
      case STATES.TIMER:
        return (
          <TimerView
            project={selectedProject?.name}
            task={selectedProject?.focus}
            onBack={showNow}
            isActive={focusPanel === 'main'}
            streakDays={projectStats.streakDays}
          />
        );

      case STATES.PLAN:
        return (
          <PlanView
            onBack={showNow}
            onQuit={onExit}
            onStartSession={showTimer}
            isActive={focusPanel === 'main'}
            projects={projects}
            selectedProjectId={selectedProject?.id ?? null}
            onSelectProject={handleSelectProjectById}
          />
        );

      case STATES.NOW:
      default:
        if (loading && projects.length === 0) {
          return <Box padding={1}><Text dimColor>Loading projects...</Text></Box>;
        }
        return (
          <NowView
            projects={projects}
            onQuit={onExit}
            isActive={focusPanel === 'main'}
            pendingCaptures={pendingCaptures}
            activeProjectId={activeProjectId}
            selectedProject={selectedProject}
            onSelectProject={(p) => { handleSelectProject(p); }}
            selectedIndex={sidebarIndex}
            onSelectedIndexChange={handleSidebarIndexChange}
            heatmapGrid={projectStats.heatmapGrid}
            streakDays={projectStats.streakDays}
            totalSessions={projectStats.totalSessions}
            breadcrumbs={projectStats.breadcrumbs}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      <Box flexDirection="column" width="100%" height="100%">
        {showHelp ? (
          <Box flexGrow={1} justifyContent="center" alignItems="center">
            <HelpOverlay scope={currentView as 'now' | 'timer' | 'plan'} />
          </Box>
        ) : (
          <Box flexGrow={1}>
            <LayoutManager layout={layout} focusPanel={focusPanel}>
              {() => <Box width="100%" height="100%">{renderCurrentView()}</Box>}
            </LayoutManager>
          </Box>
        )}

        <Box paddingX={1} width="100%">
          <StatusBar
            currentView={currentView}
            layout={layout}
            focusPanel={focusPanel}
            hasActiveSession={hasActiveSession}
            activeProjectName={activeProjectName}
            sessionSeconds={sessionSeconds}
            pendingCaptures={pendingCaptures}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};
