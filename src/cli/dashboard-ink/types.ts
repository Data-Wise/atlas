/**
 * types.ts — Shared type definitions for the Atlas Ink Dashboard
 *
 * Unified Project interface used across all dashboard components:
 *   App, MainView, DetailView, EcosystemView, SidebarPanel, InspectorPanel
 */

export interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  focus?: string;
  path?: string;
  next?: string;
  /** Project priority level (used by EcosystemView) */
  priority?: number;
  /** Recent activity sparkline data (5-day session minutes, newest last) */
  recentActivity?: number[];
  /** Focus score 0-100 (from GetSessionStatsUseCase) */
  focusScore?: number;
  /** Focus tier classification */
  focusTier?: {
    symbol: string;
    color: string;
    label: string;
  };
}
