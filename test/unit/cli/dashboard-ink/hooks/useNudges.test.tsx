/**
 * useNudges — the dashboard's first hook test, and its first write path.
 *
 * Every real hazard in this feature lives in the hook and is unreachable
 * from a component test (NowView receives plain props), so this file is
 * where the poll/ack race, ack sequencing, and partial-failure containment
 * are actually covered. See SPEC-dashboard-nudge-awareness-2026-08-01.md §7.
 *
 * Harness note: the fake container returns plain object literals, never
 * constructed `Nudge` entities — that is only possible because the hook
 * flattens to `DashboardNudge` at the boundary.
 */
import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { jest } from '@jest/globals';
import { AtlasProvider } from '../../../../../src/cli/dashboard-ink/lib/AtlasContext.js';
import { useNudges } from '../../../../../src/cli/dashboard-ink/hooks/useNudges.js';

const FIRED_A = { id: 'ndg_a', time: '09:00', message: 'stand up', recurring: false, state: 'fired' };
const FIRED_B = { id: 'ndg_b', time: '11:30', message: 'water', recurring: true, state: 'fired' };
const PENDING_C = { id: 'ndg_c', time: '23:00', message: 'wrap up', recurring: false, state: 'pending' };

/** Minimal fake Container — only the two accessors useNudges touches. */
function fakeContainer({ nudges = [] as any[], ack = null as any, list = null as any } = {}) {
  const listFn = list ?? jest.fn(async () => nudges);
  const ackFn = ack ?? jest.fn(async ({ id }: any) => ({ id, state: 'acked' }));
  return {
    _list: listFn,
    _ack: ackFn,
    getListNudgesUseCase: () => ({ execute: listFn }),
    getAckNudgeUseCase: () => ({ execute: ackFn }),
  };
}

/** Renders the hook's result as scrapeable text, and exposes it to the test. */
function Probe({ onHook }: { onHook?: (r: any) => void }) {
  const r = useNudges();
  onHook?.(r);
  return (
    <Text>
      {`F:${r.fired.length} P:${r.pending.length} A:${r.acking ? 1 : 0}${r.ackError ? ` E:${r.ackError}` : ''}`}
    </Text>
  );
}

function renderHook(container: any) {
  let latest: any = null;
  const utils = render(
    <AtlasProvider container={container}>
      <Probe onHook={(r) => { latest = r; }} />
    </AtlasProvider>
  );
  return { ...utils, get current() { return latest; } };
}

/** Existing-suite convention: real timers, short awaits (fake timers flake with Ink). */
const flush = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

describe('useNudges', () => {
  it('splits fired vs pending by state from a single outstandingOnly call', async () => {
    const c = fakeContainer({ nudges: [FIRED_A, PENDING_C, FIRED_B] });
    const { lastFrame, unmount } = renderHook(c);
    await flush();

    expect(lastFrame()).toContain('F:2 P:1');
    // outstandingOnly filters acked; the fired/pending split is the hook's job.
    expect(c._list).toHaveBeenCalledWith({ outstandingOnly: true });
    unmount();
  });

  it('never throws on a failing poll — logs to stderr and replays last-good', async () => {
    const spy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let call = 0;
    const list = jest.fn(async () => {
      call += 1;
      if (call === 1) return [FIRED_A, PENDING_C];
      throw new Error('guards.json unreadable');
    });
    const c = fakeContainer({ list });
    const { lastFrame, current, unmount } = renderHook(c);
    await flush();
    expect(lastFrame()).toContain('F:1 P:1');

    // Force the failing second fetch through the public surface.
    await current.ackAllFired().catch(() => {});
    await flush();

    expect(lastFrame()).toContain('F:1 P:1'); // last-good replayed, not blanked
    expect(spy.mock.calls.some(([m]: any) => String(m).includes('[atlas-dash] useNudges error:'))).toBe(true);
    spy.mockRestore();
    unmount();
  });

  it('acks every fired nudge in order and never a pending one', async () => {
    const c = fakeContainer({ nudges: [FIRED_A, PENDING_C, FIRED_B] });
    const { current, unmount } = renderHook(c);
    await flush();

    await current.ackAllFired();
    await flush();

    expect((c._ack as any).mock.calls.map((call: any) => call[0].id)).toEqual(['ndg_a', 'ndg_b']);
    unmount();
  });

  it('continues past a failing ack and surfaces it via ackError', async () => {
    const ack = jest.fn(async ({ id }: any) => {
      if (id === 'ndg_a') throw new Error('Nudge ndg_a not found — cannot ack');
      return { id, state: 'acked' };
    });
    const c = fakeContainer({ nudges: [FIRED_A, FIRED_B], ack });
    const { lastFrame, current, unmount } = renderHook(c);
    await flush();

    await current.ackAllFired();
    await flush();

    expect((ack as any).mock.calls.map((call: any) => call[0].id)).toEqual(['ndg_a', 'ndg_b']);
    expect(lastFrame()).toContain('E:');
    expect(lastFrame()).toContain('1 of 2');
    unmount();
  });

  it('stops polling after unmount', async () => {
    const c = fakeContainer({ nudges: [FIRED_A] });
    const { unmount } = renderHook(c);
    await flush();
    const callsAtUnmount = (c._list as any).mock.calls.length;

    unmount();
    await flush(60);

    expect((c._list as any).mock.calls.length).toBe(callsAtUnmount);
  });

  it('does not let a poll already in flight resurrect a badge ack just cleared', async () => {
    // The hazard SPEC-dashboard-nudge-awareness-2026-08-01.md §6 calls the most
    // likely bug: a poll's list() call starts BEFORE 'a' is pressed and resolves
    // AFTER the optimistic clear, while the ack round-trip is still in flight.
    // Without the ackInFlightRef check (after the await, in fetchNudges), that
    // stale resolution overwrites the just-cleared badge.
    //
    // Needs the automatic 10s poll to fire without a real 10s wait — fake timers
    // are scoped to this one test only (advance macrotasks; promise resolution
    // order is still under manual control below), then restored in `finally` so
    // the rest of the suite keeps the real-timer convention.
    jest.useFakeTimers();
    try {
      let call = 0;
      let resolveStalePoll: (v: any) => void = () => {};
      const list = jest.fn(() => {
        call += 1;
        if (call === 1) return Promise.resolve([FIRED_A]); // mount
        if (call === 2) return new Promise((resolve) => { resolveStalePoll = resolve; }); // the poll-in-flight
        return Promise.resolve([]); // ackAllFired's forced refetch — post-ack truth
      });
      let resolveAck: (v: any) => void = () => {};
      const ack = jest.fn(() => new Promise((resolve) => { resolveAck = resolve; }));
      const c = fakeContainer({ list, ack });
      const { lastFrame, current, unmount } = renderHook(c);

      await jest.advanceTimersByTimeAsync(0); // mount fetch (call 1) settles
      expect(lastFrame()).toContain('F:1');

      await jest.advanceTimersByTimeAsync(10000); // fires the poll (call 2); left pending
      expect(list.mock.calls.length).toBe(2);

      const ackPromise = current.ackAllFired(); // optimistic clear; ack (call to ack()) now in flight
      await jest.advanceTimersByTimeAsync(0);
      expect(lastFrame()).toContain('F:0');

      // The stale poll resolves NOW — while ackInFlightRef is still true, because
      // the ack round-trip (resolveAck below) hasn't settled yet. This is the
      // exact ordering the guard exists for.
      resolveStalePoll([FIRED_A]);
      await jest.advanceTimersByTimeAsync(0);
      expect(lastFrame()).toContain('F:0'); // guard must have suppressed the stale write

      resolveAck({ id: FIRED_A.id, state: 'acked' });
      await jest.advanceTimersByTimeAsync(0);
      await ackPromise;
      expect(list.mock.calls.length).toBe(3); // forced refetch ran
      expect(lastFrame()).toContain('F:0'); // reconciled with truth, still empty

      unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('ignores a concurrent ackAllFired while one is already in flight', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const ack = jest.fn(async ({ id }: any) => {
      await gate;
      return { id, state: 'acked' };
    });
    const c = fakeContainer({ nudges: [FIRED_A, FIRED_B], ack });
    const { current, unmount } = renderHook(c);
    await flush();

    const first = current.ackAllFired();
    const second = current.ackAllFired(); // must be a no-op, not a second pass
    release();
    await Promise.all([first, second]);
    await flush();

    // Two fired nudges, one ack each — not four.
    expect((ack as any).mock.calls.length).toBe(2);
    unmount();
  });
});
