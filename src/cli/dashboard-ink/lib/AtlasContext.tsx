/**
 * AtlasContext — React Context for Atlas DI Container
 *
 * Provides the Container instance to all dashboard components via React Context.
 * The Container gives access to repositories and use cases following Clean Architecture.
 *
 * Since the Ink dashboard runs as a child process (via npx tsx), the Container
 * is constructed here rather than passed from the parent process.
 */

import React, { createContext, useContext } from 'react';

// The Container type from the DI system
// Using `any` since Container.js is plain JS without type exports
type ContainerInstance = any;

const AtlasContext = createContext<ContainerInstance | null>(null);

interface AtlasProviderProps {
  container: ContainerInstance;
  children: React.ReactNode;
}

export const AtlasProvider: React.FC<AtlasProviderProps> = ({ container, children }) => {
  return (
    <AtlasContext.Provider value={container}>
      {children}
    </AtlasContext.Provider>
  );
};

export function useAtlas(): ContainerInstance {
  const container = useContext(AtlasContext);
  if (!container) {
    throw new Error('useAtlas must be used within an AtlasProvider');
  }
  return container;
}
