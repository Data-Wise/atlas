import { useState, useEffect, useRef } from 'react';
import { useAtlas } from '../lib/AtlasContext.js';
import type { AnalyticsData, WeekSummary, DeadZone } from '../types.js';
import { buildPatternGrid } from '../../../adapters/presenters/PatternPresenter.js';

const POLL_INTERVAL = 60000;

interface AnalyticsResult {
  data: AnalyticsData | null;
  velocityLoading: boolean;
  patternLoading: boolean;
  velocityError: Error | null;
  patternError: Error | null;
}

export function useAnalytics(projectId: string | null): AnalyticsResult {
  const container = useAtlas();
  const [result, setResult] = useState<AnalyticsResult>({
    data: null,
    velocityLoading: true,
    patternLoading: true,
    velocityError: null,
    patternError: null,
  });
  const lastGoodData = useRef<AnalyticsData | null>(null);

  useEffect(() => {
    if (!projectId) {
      setResult(prev => ({ ...prev, velocityLoading: false, patternLoading: false }));
      return;
    }

    let cancelled = false;

    async function fetchAnalytics() {
      try {
        const projectRepo = container.getProjectRepository();
        const sessionRepo = container.getSessionRepository();
        const statsUseCase = container.getGetSessionStatsUseCase();

        const project = await projectRepo.findById(projectId);
        const projectName = project?.name;
        if (cancelled || !projectName) return;

        // ── Velocity data (30-day sparkline + weekly summaries) ──────────────
        let velocitySparkline: number[] = [];
        let velocityTrend = 0;
        let velocityAvg = 0;
        let weeklySummaries: WeekSummary[] = [];
        let velocityError: Error | null = null;

        try {
          const [dailyMinutes, sessionStats] = await Promise.all([
            sessionRepo.getDailyFocusMinutes(projectName, 30),
            statsUseCase.execute({ days: 28, project: projectName }),
          ]);

          velocitySparkline = dailyMinutes;

          const sum = dailyMinutes.reduce((a: number, b: number) => a + b, 0);
          velocityAvg = Math.round(sum / 30);

          // Weekly summaries from sessionStats
          if (sessionStats?.dailyBreakdown) {
            const weeks = bucketByWeek(sessionStats.dailyBreakdown, 4);
            weeklySummaries = weeks;

            if (weeks.length >= 2) {
              const prev = weeks[weeks.length - 2]?.totalMinutes ?? 1;
              const curr = weeks[weeks.length - 1]?.totalMinutes ?? 0;
              velocityTrend = Math.round(((curr - prev) / Math.max(prev, 1)) * 100);
            }
          }
        } catch (err: any) {
          velocityError = err;
          process.stderr.write(`[atlas-dash] useAnalytics velocity error: ${err.message}\n`);
        }

        // ── Pattern data (7x24 grid + best day/hour + dead zones) ───────────
        let patternGrid: number[][] = [];
        let patternBestDay = '';
        let patternBestHour = '';
        let patternDeadZones: DeadZone[] = [];
        let patternError: Error | null = null;

        try {
          const sessions = await sessionRepo.findByProject(projectName);

          if (sessions && sessions.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { PatternAnalyzer } = await import('../../utils/PatternAnalyzer.js');
            const analyzer = new PatternAnalyzer(sessions);
            const patterns = analyzer.analyze();

            patternGrid = buildPatternGrid(sessions);
            patternBestDay = patterns.bestDay ?? '';
            patternBestHour = patterns.bestHour != null ? `${patterns.bestHour}:00` : '';
            patternDeadZones = (patterns.deadZones || []).map((dz: any) => ({
              day: dz.day ?? '',
              hour: dz.hour != null ? `${dz.hour}:00` : '',
              intensity: dz.type === 'day' ? 1 : 0.5,
            }));
          }
        } catch (err: any) {
          patternError = err;
          process.stderr.write(`[atlas-dash] useAnalytics pattern error: ${err.message}\n`);
        }

        if (cancelled) return;

        const data: AnalyticsData = {
          velocitySparkline,
          velocityTrend,
          velocityAvg,
          weeklySummaries,
          patternGrid,
          patternBestDay,
          patternBestHour,
          patternDeadZones,
        };

        lastGoodData.current = data;
        setResult({
          data,
          velocityLoading: false,
          patternLoading: false,
          velocityError,
          patternError,
        });
      } catch (err: any) {
        if (cancelled) return;
        process.stderr.write(`[atlas-dash] useAnalytics error: ${err.message}\n`);
        if (lastGoodData.current) {
          setResult(prev => ({ ...prev, data: lastGoodData.current, velocityLoading: false, patternLoading: false }));
        } else {
          setResult(prev => ({ ...prev, velocityLoading: false, patternLoading: false }));
        }
      }
    }

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [container, projectId]);

  return result;
}

function bucketByWeek(dailyBreakdown: any[], weeks: number): WeekSummary[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: WeekSummary[] = [];
  const buckets: { totalMinutes: number; sessionCount: number; days: string[] }[] = [];

  for (let w = 0; w < weeks; w++) {
    buckets.push({ totalMinutes: 0, sessionCount: 0, days: [] });
  }

  const today = new Date();
  for (let d = 0; d < weeks * 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];

    const entry = dailyBreakdown.find((db: any) => db.date === dateStr);
    if (entry) {
      const weekIdx = Math.min(Math.floor(d / 7), weeks - 1);
      buckets[weekIdx].totalMinutes += entry.minutes ?? 0;
      buckets[weekIdx].sessionCount += entry.sessions ?? 0;
    }

    if (d % 7 === 6 || d === weeks * 7 - 1) {
      const weekIdx = Math.floor(d / 7);
      if (weekIdx < weeks) {
        const endDate = new Date(date);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
        const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
        const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`;
        buckets[weeks - 1 - weekIdx].days = [startStr, endStr];
      }
    }
  }

  for (let w = 0; w < weeks; w++) {
    const b = buckets[w];
    if (b.days.length === 2) {
      result.push({
        label: `${b.days[0]}\u2013${b.days[1]}`,
        totalMinutes: Math.round(b.totalMinutes),
        sessionCount: b.sessionCount,
        trend: 0,
      });
    }
  }

  return result.reverse();
}
