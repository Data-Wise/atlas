/**
 * useNudges — wall-clock nudge awareness for the dashboard, plus ack.
 *
 * Polls guards.json every 10s (live, no cache — a nudge fired by launchd in
 * another surface must appear here promptly) and exposes a single write:
 * ack every currently-fired nudge.
 *
 * TWO DELIBERATE DEVIATIONS from the other five hooks, both per
 * SPEC-dashboard-nudge-awareness-2026-08-01.md — do not "clean up":
 *
 * 1. This hook returns an ACTION (`ackAllFired`), where the others are
 *    pure-read. It owns both the state and the poll interval, so it is the
 *    only thing that can invalidate its own state after a write *and*
 *    suppress an in-flight poll. Wiring the action in App.tsx would need a
 *    refreshToken threaded back into these deps and still couldn't do the
 *    latter.
 * 2. Ack failures go to `ackError` UI state and are NOT written to stderr.
 *    `atlas dash` spawns with stdio:'inherit', so stderr writes land inside
 *    the rendered frame. That's tolerable for background poll failures
 *    (which keep the stderr convention below) but not for a user-triggered
 *    action, which is far likelier to be hit.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtlas } from '../lib/AtlasContext.js';
import type { DashboardNudge } from '../types.js';

const POLL_INTERVAL = 10000; // 10 seconds

interface NudgesResult {
  /** state === 'fired' — fired but not yet acked. Needs attention. */
  fired: DashboardNudge[];
  /** state === 'pending' — scheduled, not yet fired. Informational. */
  pending: DashboardNudge[];
  /** True while ackAllFired is in flight. */
  acking: boolean;
  /** Last ack failure, surfaced in the UI (never stderr — see header). */
  ackError: string | null;
  /** Ack every currently-fired nudge, sequentially. No-op when none / in flight. */
  ackAllFired: () => Promise<void>;
}

/** Flatten the Nudge entity at the boundary — never hold one in React state. */
function toPlain(n: any): DashboardNudge {
  return {
    id: n.id,
    time: n.time,
    message: n.message,
    recurring: Boolean(n.recurring),
    state: n.state,
  };
}

export function useNudges(): NudgesResult {
  const container = useAtlas();
  const [fired, setFired] = useState<DashboardNudge[]>([]);
  const [pending, setPending] = useState<DashboardNudge[]>([]);
  const [acking, setAcking] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  // Stale-while-revalidate, matching useProjects/useAnalytics.
  const lastGoodRef = useRef<{ fired: DashboardNudge[]; pending: DashboardNudge[] }>({ fired: [], pending: [] });
  // Suppresses the poll's setState while an ack round-trip is in flight, so a
  // poll that started BEFORE the ack cannot resurrect a cleared badge. Also
  // the double-press guard: a ref, checked synchronously, because two 'a'
  // presses in one tick would both observe `acking === false`.
  const ackInFlightRef = useRef(false);
  // Read by ackAllFired so it never closes over a stale `fired`.
  const firedRef = useRef<DashboardNudge[]>([]);
  firedRef.current = fired;
  // Gates post-unmount setState (the ack round-trip outlives a quick quit).
  const cancelledRef = useRef(false);

  const fetchNudges = useCallback(async (opts: { force?: boolean } = {}) => {
    try {
      const listUseCase = container.getListNudgesUseCase();
      // outstandingOnly === isOutstanding() === state !== 'acked', so this
      // returns pending AND fired; splitting on state is this hook's job.
      const nudges = await listUseCase.execute({ outstandingOnly: true });

      if (cancelledRef.current) return;
      // Checked AFTER the await on purpose — that is the whole point.
      if (!opts.force && ackInFlightRef.current) return;

      const plain = (nudges ?? []).map(toPlain);
      const nextFired = plain.filter((n: DashboardNudge) => n.state === 'fired');
      const nextPending = plain.filter((n: DashboardNudge) => n.state === 'pending');

      lastGoodRef.current = { fired: nextFired, pending: nextPending };
      setFired(nextFired);
      setPending(nextPending);
    } catch (err: any) {
      if (cancelledRef.current) return;
      process.stderr.write(`[atlas-dash] useNudges error: ${err.message}\n`);
      setFired(lastGoodRef.current.fired);
      setPending(lastGoodRef.current.pending);
    }
  }, [container]);

  const ackAllFired = useCallback(async () => {
    // Synchronous check-and-set BEFORE any await — a state-based guard loses
    // the race on two keypresses in the same tick.
    if (ackInFlightRef.current) return;
    const targets = firedRef.current;
    if (targets.length === 0) return;

    ackInFlightRef.current = true;
    setAcking(true);
    setAckError(null);
    // Optimistic — the badge must clear on the next frame, not in 10s.
    setFired([]);

    let failures = 0;
    let lastMessage = '';
    try {
      const ackUseCase = container.getAckNudgeUseCase();
      // Sequential, not Promise.all: avoids contending on the guards.json
      // lock and a burst of `launchctl unload` subprocesses, and keeps
      // partial-failure reporting deterministic.
      for (const n of targets) {
        try {
          await ackUseCase.execute({ id: n.id });
        } catch (err: any) {
          failures += 1;
          lastMessage = err.message;
        }
      }
    } finally {
      ackInFlightRef.current = false;
      if (!cancelledRef.current) setAcking(false);
    }

    if (cancelledRef.current) return;
    if (failures > 0) {
      setAckError(`${failures} of ${targets.length} not acked: ${lastMessage}`);
    }
    // Reconcile with truth — force past the guard we just cleared, since an
    // ack can partly fail and the optimistic clear would then be a lie.
    await fetchNudges({ force: true });
  }, [container, fetchNudges]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchNudges();
    const interval = setInterval(fetchNudges, POLL_INTERVAL);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [fetchNudges]);

  return { fired, pending, acking, ackError, ackAllFired };
}
