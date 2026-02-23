/**
 * usePendingCaptures — Track inbox capture count for the sidebar badge
 *
 * Polls the capture repository every 10 seconds for unprocessed inbox items.
 */

import { useState, useEffect } from 'react';
import { useAtlas } from '../lib/AtlasContext.js';

const POLL_INTERVAL = 10000; // 10 seconds

interface PendingCapturesResult {
  count: number;
}

export function usePendingCaptures(): PendingCapturesResult {
  const container = useAtlas();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const captureRepo = container.getCaptureRepository();
        const inbox = await captureRepo.getInbox();

        if (cancelled) return;
        setCount(inbox.length);
      } catch (err: any) {
        if (cancelled) return;
        process.stderr.write(`[atlas-dash] usePendingCaptures error: ${err.message}\n`);
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [container]);

  return { count };
}
