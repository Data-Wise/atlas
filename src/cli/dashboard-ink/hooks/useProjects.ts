/**
 * useProjects — Fetch real project list with focus scores and sparklines
 *
 * Replaces MOCK_PROJECTS in App.tsx. Polls the project repository every 5 seconds,
 * enriches each domain Project with session stats (focusScore, sparkline, tier).
 */

import { useState, useEffect, useRef } from 'react';
import { useAtlas } from '../lib/AtlasContext.js';
import type { Project } from '../types.js';

// @ts-ignore — JS modules without type declarations
import { getTierFromScore } from '../../../adapters/presenters/FocusScorePresenter.js';
// @ts-ignore
import { projectSparklineData } from '../../../adapters/presenters/StatsPresenter.js';

const POLL_INTERVAL = 5000; // 5 seconds

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: Error | null;
}

export function useProjects(): UseProjectsResult {
  const container = useAtlas();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastGoodData = useRef<Project[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      try {
        const projectRepo = container.getProjectRepository();
        const sessionRepo = container.getSessionRepository();

        // Fetch all projects and recent sessions in parallel
        const [domainProjects, sessions] = await Promise.all([
          projectRepo.findAll(),
          sessionRepo.list({
            since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            orderBy: 'startTime',
            order: 'desc',
          }),
        ]);

        if (cancelled) return;

        // Get per-project stats for focus score
        const statsUseCase = container.getGetSessionStatsUseCase();

        const mapped: Project[] = await Promise.all(
          domainProjects.map(async (dp: any) => {
            let focusScore = 0;
            let focusTier = getTierFromScore(0);

            try {
              const stats = await statsUseCase.execute({
                days: 7,
                project: dp.name,
              });
              focusScore = stats?.focusScore?.score ?? 0;
              focusTier = getTierFromScore(focusScore);
            } catch {
              // Stats may fail for projects with no sessions — use defaults
            }

            const sparkline = projectSparklineData(sessions, dp.name, 5);

            return {
              id: dp.id,
              name: dp.name,
              type: dp.type ?? 'unknown',
              status: dp.status ?? 'unknown',
              progress: dp.progress ?? 0,
              focus: dp.focus,
              path: dp.path,
              next: dp.next,
              recentActivity: sparkline,
              focusScore,
              focusTier,
            } as Project;
          }),
        );

        if (cancelled) return;

        lastGoodData.current = mapped;
        setProjects(mapped);
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        // Stale-while-revalidate: keep last good data, report error
        process.stderr.write(`[atlas-dash] useProjects error: ${err.message}\n`);
        setError(err);
        if (lastGoodData.current.length > 0) {
          setProjects(lastGoodData.current);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProjects();
    const interval = setInterval(fetchProjects, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [container]);

  return { projects, loading, error };
}
