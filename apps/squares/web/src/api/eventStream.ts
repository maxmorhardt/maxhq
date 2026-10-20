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
  connectTimeoutMs?: number;
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
// the server writes as soon as a stream opens, so a slow first byte means it is stuck
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
// three quick retries, about five seconds in all, before asking the user
export const RETRY_DELAYS_MS = [500, 1500, 3000];

export function backoff(attempt: number): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1];
  return base * (0.9 + Math.random() * 0.2);
}

const warn = (reason: string) => console.warn(`event stream: ${reason}`);

// a fetch-based server-sent event client: bearer auth, Last-Event-ID resume, and reconnects that survive sleeping tabs
export function openEventStream({
  url,
  getToken,
  onMessage,
  onStatus,
  onRejected,
  heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS,
  connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS,
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

  // a watchdog that aborts the connection unless it is reset in time
  const startWatchdog = (controller: AbortController) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      reset: (ms: number, reason: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          warn(reason);
          controller.abort();
        }, ms);
      },
      stop: () => clearTimeout(timer),
    };
  };

  const read = async (
    body: ReadableStream<Uint8Array>,
    controller: AbortController,
    watchdog: ReturnType<typeof startWatchdog>
  ): Promise<boolean> => {
    let received = false;
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

    watchdog.reset(connectTimeoutMs, 'no data after the stream opened, reconnecting');
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          warn('the server ended the stream, reconnecting');
          return received;
        }
        // the stream counts as live once data actually arrives, not when the headers do
        lastActivity = Date.now();
        received = true;
        everLive = true;
        setStatus('live');
        watchdog.reset(heartbeatTimeoutMs, 'heartbeat missed, reconnecting');
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } catch {
      // aborted, timed out, or the network dropped; the caller reconnects
    }
    return received;
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

    const watchdog = startWatchdog(controller);
    watchdog.reset(connectTimeoutMs, 'no response to the stream request, retrying');
    try {
      let response: Response;
      try {
        response = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
      } catch (err) {
        if (!controller.signal.aborted) {
          warn(`request failed (${err instanceof Error ? err.message : 'network error'})`);
        }
        return 'failed';
      }

      if (response.status === 401) {
        warn('token rejected (401), refreshing');
        return 'unauthorized';
      }
      if (REJECTED_STATUSES.has(response.status)) {
        onRejected(response.status);
        return 'rejected';
      }
      if (!response.ok || !response.body) {
        warn(`unexpected response (${response.status})`);
        return 'failed';
      }

      // a stream that delivered data dropped; one that never did failed to connect
      return (await read(response.body, controller, watchdog)) ? 'dropped' : 'failed';
    } finally {
      watchdog.stop();
    }
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
      if (attempt > RETRY_DELAYS_MS.length) {
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
