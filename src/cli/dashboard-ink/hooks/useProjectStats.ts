/**
 * useProjectStats — Fetch real focus score, heatmap, streak, and breadcrumbs
 * for the currently selected project.
 *
 * Replaces MOCK_HEATMAP_GRID, MOCK_CRUMBS, and hardcoded streakDays/totalSessions.
 * Polls every 10 seconds.
 */

import { useState, useEffect, useRef } from 'react';
import { useAtlas } from '../lib/AtlasContext.js';

// @ts-ignore — JS modules without type declarations
import { formatHeatmapGrid } from '../../../adapters/presenters/StatsPresenter.js';

const POLL_INTERVAL = 10000; // 10 seconds

type HeatmapCell = { date: string; value: number; level: number };
type HeatmapGrid = HeatmapCell[][];

interface ProjectStatsResult {
  focusScore: number;
  heatmapGrid: HeatmapGrid;
  breadcrumbs: string[];
  streakDays: number;
  totalSessions: number;
  loading: boolean;
}

const EMPTY_GRID: HeatmapGrid = Array.from({ length: 7 }, () =>
  Array.from({ length: 13 }, () => ({ date: '', value: 0, level: 0 })),
);

export function useProjectStats(projectId: string | null): ProjectStatsResult {
  const container = useAtlas();
  const [stats, setStats] = useState<ProjectStatsResult>({
    focusScore: 0,
    heatmapGrid: EMPTY_GRID,
    breadcrumbs: [],
    streakDays: 0,
    totalSessions: 0,
    loading: true,
  });
  const lastGoodStats = useRef<ProjectStatsResult | null>(null);

  useEffect(() => {
    if (!projectId) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      try {
        const statsUseCase = container.getGetSessionStatsUseCase();
        const breadcrumbRepo = container.getBreadcrumbRepository();
        const projectRepo = container.getProjectRepository();

        // Look up project name from ID
        const project = await projectRepo.findById(projectId);
        const projectName = project?.name;

        if (cancelled || !projectName) return;

        // Fetch stats and breadcrumbs in parallel
        const [sessionStats, crumbs] = await Promise.all([
          statsUseCase.execute({ days: 90, project: projectName }),
          breadcrumbRepo.findRecent(projectName, 5),
        ]);

        if (cancelled) return;

        const result: ProjectStatsResult = {
          focusScore: sessionStats?.focusScore?.score ?? 0,
          heatmapGrid: sessionStats?.dailyBreakdown
            ? formatHeatmapGrid(sessionStats.dailyBreakdown, { weeks: 13 })
            : EMPTY_GRID,
          breadcrumbs: crumbs.map((c: any) => c.text),
          streakDays: sessionStats?.streak?.current ?? 0,
          totalSessions: sessionStats?.summary?.totalSessions ?? 0,
          loading: false,
        };

        lastGoodStats.current = result;
        setStats(result);
      } catch (err: any) {
        if (cancelled) return;
        process.stderr.write(`[atlas-dash] useProjectStats error: ${err.message}\n`);
        // Stale-while-revalidate
        if (lastGoodStats.current) {
          setStats(lastGoodStats.current);
        } else {
          setStats(prev => ({ ...prev, loading: false }));
        }
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [container, projectId]);

  return stats;
}
