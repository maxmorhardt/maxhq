import { createParser } from 'eventsource-parser';

export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'failed';

export interface StreamMessage {
  id: string | null;
  data: string;
}

export interface EventStreamOptions {
  url: string;
  getToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>;
  onMessage: (message: StreamMessage) => void;
  onStatus: (status: StreamStatus) => void;
  // a status retrying cannot fix, like 403 or 404; the stream stops
  onRejected: (status: number) => void;
  heartbeatTimeoutMs?: number;
  maxAttempts?: number;
}

export interface EventStream {
  // reconnects now; resync drops the resume point so the server starts over with a snapshot
  reconnect: (options?: { resync?: boolean }) => void;
  close: () => void;
}

type Outcome = 'dropped' | 'failed' | 'unauthorized' | 'rejected';

const REJECTED_STATUSES = new Set([403, 404]);
// the server pings every 25s, so a silent minute means the connection is dead
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 30_000;

export function backoff(attempt: number): number {
  const base = Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  return base * (0.8 + Math.random() * 0.4);
}

// a fetch-based server-sent event client: bearer auth, Last-Event-ID resume, and reconnects that survive sleeping tabs
export function openEventStream({
  url,
  getToken,
  onMessage,
  onStatus,
  onRejected,
  heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: EventStreamOptions): EventStream {
  let closed = false;
  let lastEventId: string | null = null;
  let connection: AbortController | null = null;
  let lastActivity = 0;
  let status: StreamStatus | null = null;
  let everLive = false;
  let skipBackoff = false;
  let wake: (() => void) | null = null;

  const setStatus = (next: StreamStatus) => {
    if (next !== status) {
      status = next;
      onStatus(next);
    }
  };

  // waits out the backoff unless a reconnect, the tab returning, or the network coming back cuts it short
  const pause = (ms: number) =>
    new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        wake = null;
        resolve();
      };
      const timer = Number.isFinite(ms) ? setTimeout(done, ms) : undefined;
      wake = done;
    });

  const read = async (body: ReadableStream<Uint8Array>, controller: AbortController) => {
    const parser = createParser({
      onEvent: ({ id, data }) => {
        if (controller.signal.aborted) {
          return;
        }
        if (id) {
          lastEventId = id;
        }
        onMessage({ id: id ?? null, data });
      },
    });
    const reader = body.getReader();
    const decoder = new TextDecoder();
    // cancel the read directly rather than trust every browser to error the body on abort
    controller.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}));

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const touch = () => {
      lastActivity = Date.now();
      clearTimeout(watchdog);
      watchdog = setTimeout(() => controller.abort(), heartbeatTimeoutMs);
    };

    touch();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          return;
        }
        touch();
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch {
      // aborted, timed out, or the network dropped; the caller reconnects
    } finally {
      clearTimeout(watchdog);
    }
  };

  const connect = async (forceRefresh: boolean): Promise<Outcome> => {
    const controller = new AbortController();
    connection = controller;

    const token = await getToken({ forceRefresh });
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (lastEventId) {
      headers['Last-Event-ID'] = lastEventId;
    }

    let response: Response;
    try {
      response = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
    } catch {
      return 'failed';
    }

    if (response.status === 401) {
      return 'unauthorized';
    }
    if (REJECTED_STATUSES.has(response.status)) {
      onRejected(response.status);
      return 'rejected';
    }
    if (!response.ok || !response.body) {
      return 'failed';
    }

    everLive = true;
    setStatus('live');
    await read(response.body, controller);
    return 'dropped';
  };

  const run = async () => {
    let attempt = 0;
    let refreshToken = false;

    while (!closed) {
      const outcome = await connect(refreshToken);
      if (closed || outcome === 'rejected') {
        return;
      }

      // a token the server turns away is refreshed once, straight away
      if (outcome === 'unauthorized' && !refreshToken) {
        refreshToken = true;
        continue;
      }
      refreshToken = false;

      if (skipBackoff) {
        skipBackoff = false;
        attempt = 0;
        continue;
      }

      attempt = outcome === 'dropped' ? 1 : attempt + 1;
      if (attempt > maxAttempts) {
        setStatus('failed');
        await pause(Infinity);
        attempt = 0;
        continue;
      }

      setStatus(everLive ? 'reconnecting' : 'connecting');
      await pause(backoff(attempt));
    }
  };

  // a paused loop wakes up; a live or connecting one is cut off and starts over without waiting
  const restart = () => {
    if (wake) {
      wake();
      return;
    }
    skipBackoff = true;
    connection?.abort();
  };

  const resume = () => {
    if (closed || document.visibilityState === 'hidden') {
      return;
    }

    // a waiting loop retries now; a tab that slept may hold a connection that silently died
    if (wake || (status === 'live' && Date.now() - lastActivity > heartbeatTimeoutMs)) {
      restart();
    }
  };

  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', resume);

  setStatus('connecting');
  void run();

  return {
    reconnect: ({ resync = false } = {}) => {
      if (closed) {
        return;
      }
      if (resync) {
        lastEventId = null;
      }
      restart();
    },
    close: () => {
      closed = true;
      connection?.abort();
      wake?.();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    },
  };
}
