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

/**
 * A wall-clock nudge, flattened for the dashboard (useNudges hook).
 *
 * Deliberately a plain object, not the `Nudge` domain entity: entity
 * instances must never enter React state (SPEC-dashboard-nudge-awareness
 * §1). The hook maps at the boundary, which also keeps the test harness to
 * object literals rather than constructed entities.
 */
export interface DashboardNudge {
  id: string;
  /** HH:MM, 24-hour */
  time: string;
  message: string;
  recurring: boolean;
  state: 'pending' | 'fired' | 'acked';
}

/** 30-day velocity data for one week (AnalyticsView) */
export interface WeekSummary {
  label: string;
  totalMinutes: number;
  sessionCount: number;
  trend: number;
  note?: string;
}

/** A low-flow time slot (AnalyticsView) */
export interface DeadZone {
  day: string;
  hour: string;
  intensity: number;
}

/** Merged analytics payload from useAnalytics hook */
export interface AnalyticsData {
  velocitySparkline: number[];
  velocityTrend: number;
  velocityAvg: number;
  weeklySummaries: WeekSummary[];
  patternGrid: number[][];
  patternBestDay: string;
  patternBestHour: string;
  patternDeadZones: DeadZone[];
}
