import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { MainView } from './views/MainView.js';

/**
 * Root App Component
 *
 * Entry point for the Ink dashboard POC.
 * In the full implementation, this would:
 * - Load real projects from Atlas registry
 * - Manage view state (BROWSE, DETAIL, FOCUS, etc.)
 * - Handle global app state
 */
export const App: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // Mock project data for POC
  const mockProjects = [
    {
      id: '1',
      name: 'atlas',
      type: 'node-package',
      status: 'active',
      progress: 100,
      focus: 'v0.9.0 Sprint 1 - TUI Modernization',
    },
    {
      id: '2',
      name: 'flow-cli',
      type: 'zsh-package',
      status: 'stable',
      progress: 95,
      focus: 'Maintenance mode',
    },
    {
      id: '3',
      name: 'mcp-server-statistical-research',
      type: 'mcp-server',
      status: 'active',
      progress: 80,
      focus: 'Add Zotero integration',
    },
    {
      id: '4',
      name: 'rmediation',
      type: 'r-package',
      status: 'paused',
      progress: 60,
      focus: 'CRAN submission prep',
    },
    {
      id: '5',
      name: 'causal-inference',
      type: 'teaching',
      status: 'active',
      progress: 45,
      focus: 'Week 3 lecture materials',
    },
  ];

  return (
    <MainView
      projects={mockProjects}
      onQuit={onExit}
    />
  );
};
