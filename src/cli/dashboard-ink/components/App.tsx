import React, { useState } from 'react';
import { useInput } from 'ink';
import { MainView } from './views/MainView.js';
import { DetailView } from './views/DetailView.js';
import { FocusView } from './views/FocusView.js';
import { ZenView } from './views/ZenView.js';
import { TimelineView } from './views/TimelineView.js';
import { EcosystemView } from './views/EcosystemView.js';
import { createStateMachine, STATES } from '../lib/stateMachine.js';

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  focus?: string;
  path?: string;
  next?: string;
}

/**
 * Root App Component
 *
 * Entry point for the Ink dashboard.
 * Manages view state and navigation between:
 * - BROWSE (MainView) - Project list
 * - DETAIL (DetailView) - Single project details
 *
 * Future views: FOCUS, ZEN, TIMELINE, ECOSYSTEM, PLAN
 */
export const App: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // Mock project data for POC
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'atlas',
      type: 'node-package',
      status: 'active',
      progress: 100,
      focus: 'v0.9.0 Sprint 1 - TUI Modernization',
      path: '/Users/dt/projects/dev-tools/atlas',
      next: 'Migrate remaining views to Ink',
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
    },
    {
      id: '4',
      name: 'rmediation',
      type: 'r-package',
      status: 'paused',
      progress: 60,
      focus: 'CRAN submission prep',
      path: '/Users/dt/projects/r-packages/rmediation',
      next: 'Complete documentation',
    },
    {
      id: '5',
      name: 'causal-inference',
      type: 'teaching',
      status: 'active',
      progress: 45,
      focus: 'Week 3 lecture materials',
      path: '/Users/dt/projects/teaching/causal-inference',
    },
  ];

  // State machine for view management
  const [stateMachine] = useState(() => createStateMachine({ initial: STATES.BROWSE }));
  const [currentView, setCurrentView] = useState<string>(STATES.BROWSE);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Handle view transitions
  const showMainView = () => {
    stateMachine.transition(STATES.BROWSE);
    setCurrentView(STATES.BROWSE);
    setSelectedProject(null);
  };

  const showDetailView = (project: Project) => {
    stateMachine.transition(STATES.DETAIL, { project });
    setCurrentView(STATES.DETAIL);
    setSelectedProject(project);
  };

  const showFocusView = () => {
    stateMachine.transition(STATES.FOCUS);
    setCurrentView(STATES.FOCUS);
  };

  const showZenView = () => {
    stateMachine.transition(STATES.ZEN);
    setCurrentView(STATES.ZEN);
  };

  const showTimelineView = () => {
    stateMachine.transition(STATES.TIMELINE);
    setCurrentView(STATES.TIMELINE);
  };

  const showEcosystemView = () => {
    stateMachine.transition(STATES.ECOSYSTEM);
    setCurrentView(STATES.ECOSYSTEM);
  };

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case STATES.ECOSYSTEM:
        return (
          <EcosystemView
            onBack={showMainView}
            onSelectProject={showDetailView}
            onFocus={showFocusView}
          />
        );

      case STATES.TIMELINE:
        return (
          <TimelineView
            onBack={showMainView}
            onFocus={showFocusView}
          />
        );

      case STATES.ZEN:
        return (
          <ZenView
            project={selectedProject?.name}
            task={selectedProject?.focus}
            onBack={showMainView}
          />
        );

      case STATES.FOCUS:
        return (
          <FocusView
            project={selectedProject?.name}
            task={selectedProject?.focus}
            onBack={showMainView}
          />
        );

      case STATES.DETAIL:
        return selectedProject ? (
          <DetailView
            project={selectedProject}
            onBack={showMainView}
          />
        ) : null;

      case STATES.BROWSE:
      default:
        return (
          <MainView
            projects={mockProjects}
            onQuit={onExit}
            onSelectProject={showDetailView}
            onFocus={showFocusView}
            onZen={showZenView}
            onTimeline={showTimelineView}
            onEcosystem={showEcosystemView}
          />
        );
    }
  };

  return renderView();
};
