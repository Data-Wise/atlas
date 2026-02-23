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

/** Filter out temp dirs, test fixtures, and archived junk from the project list */
function isDisplayableProject(dp: any): boolean {
  const name = dp.name ?? '';
  const meta = dp.metadata ?? {};
  const status = meta.status ?? '';

  // Skip temp directories (e.g. tmp.4uxrRklSiL)
  if (/^tmp\./i.test(name)) return false;

  // Skip archived projects
  if (status === 'archive' || status === 'archived') return false;

  return true;
}

/** Deduplicate by name — keep the one with the most recent lastAccessedAt */
function deduplicateByName(projects: any[]): any[] {
  const seen = new Map<string, any>();
  for (const p of projects) {
    const existing = seen.get(p.name);
    if (!existing) {
      seen.set(p.name, p);
    } else {
      const existingTime = new Date(existing.lastAccessedAt ?? 0).getTime();
      const newTime = new Date(p.lastAccessedAt ?? 0).getTime();
      if (newTime > existingTime) {
        seen.set(p.name, p);
      }
    }
  }
  return Array.from(seen.values());
}

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

        // Filter junk (tmp.*, archived) and deduplicate by name
        const displayable = deduplicateByName(domainProjects.filter(isDisplayableProject));

        // Get per-project stats for focus score
        const statsUseCase = container.getGetSessionStatsUseCase();

        const mapped: Project[] = await Promise.all(
          displayable.map(async (dp: any) => {
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

            // Domain Project uses value objects and metadata — extract primitives
            const typeStr = typeof dp.type === 'string' ? dp.type
              : dp.type?.value ?? dp.type?._value ?? String(dp.type ?? 'unknown');
            const meta = dp.metadata ?? {};

            return {
              id: dp.id,
              name: dp.name,
              type: typeStr,
              status: meta.status ?? dp.status ?? 'unknown',
              progress: meta.progress ?? dp.progress ?? 0,
              focus: meta.focus ?? dp.focus,
              path: dp.path,
              next: meta.next ?? dp.next,
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
