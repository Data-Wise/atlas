/**
 * useActiveSession — Track the currently active session with a 1-second timer
 *
 * Polls the session repository for an active session and maintains
 * a seconds-based timer that ticks every second for the Pomodoro display.
 */

import { useState, useEffect, useRef } from 'react';
import { useAtlas } from '../lib/AtlasContext.js';

interface ActiveSessionResult {
  projectName: string | null;
  elapsed: number;       // seconds since session start
  isActive: boolean;
}

export function useActiveSession(): ActiveSessionResult {
  const container = useAtlas();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Poll for active session every 5 seconds
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const sessionRepo = container.getSessionRepository();
        const active = await sessionRepo.findActive();

        if (cancelled) return;

        if (active) {
          setProjectName(active.project);
          setIsActive(true);
          startTimeRef.current = new Date(active.startTime);
        } else {
          setProjectName(null);
          setIsActive(false);
          startTimeRef.current = null;
          setElapsed(0);
        }
      } catch (err: any) {
        if (cancelled) return;
        process.stderr.write(`[atlas-dash] useActiveSession error: ${err.message}\n`);
      }
    }

    checkSession();
    const interval = setInterval(checkSession, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [container]);

  // 1-second timer tick for elapsed display
  useEffect(() => {
    if (!isActive || !startTimeRef.current) return;

    function tick() {
      if (startTimeRef.current) {
        const now = Date.now();
        const start = startTimeRef.current.getTime();
        setElapsed(Math.floor((now - start) / 1000));
      }
    }

    tick(); // immediate first tick
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  return { projectName, elapsed, isActive };
}
