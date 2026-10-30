import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoff, openEventStream, type EventStreamOptions } from './eventStream';

// a response body the test writes server-sent frames into
function sseResponse() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    send: (text: string) => controller.enqueue(encoder.encode(text)),
    end: () => controller.close(),
  };
}

const fetchMock = vi.fn();
const sentHeaders = (call: number) =>
  (fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>;

function open(overrides: Partial<EventStreamOptions> = {}) {
  const options = {
    url: 'http://api/events',
    getToken: vi.fn().mockResolvedValue('tok'),
    onMessage: vi.fn(),
    onStatus: vi.fn(),
    onRejected: vi.fn(),
    ...overrides,
  };
  return { stream: openEventStream(options), ...options };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
let warn: ReturnType<typeof vi.spyOn>;

describe('openEventStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries instead of waiting forever on a token that never comes', async () => {
    const sse = sseResponse();
    fetchMock.mockResolvedValue(sse.response);
    const getToken = vi
      .fn()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue('tok');
    const { stream, onStatus } = open({ getToken, connectTimeoutMs: 1000 });

    await flush();
    expect(fetchMock).not.toHaveBeenCalled();

    // the connect timeout covers the token, then the retry connects
    await vi.advanceTimersByTimeAsync(1000 + 300);
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    sse.send(': ok\n\n');
    await flush();
    expect(onStatus).toHaveBeenLastCalledWith('live');
    stream.close();
  });

  it('connects with the token and delivers each event', async () => {
    const sse = sseResponse();
    fetchMock.mockResolvedValue(sse.response);
    const { stream, onMessage, onStatus } = open();

    await flush();
    sse.send('id: 1-0\nevent: x\ndata: {"a":1}\n\n: ping\n\n');
    await flush();

    expect(sentHeaders(0).Authorization).toBe('Bearer tok');
    expect(onStatus).toHaveBeenCalledWith('connecting');
    expect(onStatus).toHaveBeenCalledWith('live');
    expect(onMessage).toHaveBeenCalledWith({ id: '1-0', data: '{"a":1}' });
    stream.close();
  });

  it('resumes from the last event id after the server ends the stream', async () => {
    const first = sseResponse();
    const second = sseResponse();
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    const { stream, onStatus } = open();

    await flush();
    first.send('id: 7-0\ndata: {}\n\n');
    first.end();
    await flush();
    expect(onStatus).toHaveBeenLastCalledWith('reconnecting');

    await vi.advanceTimersByTimeAsync(backoff(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentHeaders(1)['Last-Event-ID']).toBe('7-0');
    stream.close();
  });

  it('refreshes the token straight away after a 401', async () => {
    const sse = sseResponse();
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(sse.response);
    const { stream, getToken } = open();

    await flush();
    await flush();

    expect(getToken).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stream.close();
  });

  it('stops for good on a 400, 403, 404, or 410', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    const { onRejected } = open();

    await flush();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(onRejected).toHaveBeenCalledWith(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after three quick retries, under two seconds in all', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { stream, onStatus } = open();

    await flush();
    await vi.advanceTimersByTimeAsync(1900);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(onStatus).toHaveBeenLastCalledWith('failed');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    stream.close();
  });

  it('retries a failed stream when the tab comes back', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { stream } = open();

    await flush();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    stream.close();
  });

  it('only counts as live once data arrives', async () => {
    const sse = sseResponse();
    fetchMock.mockResolvedValue(sse.response);
    const { stream, onStatus } = open();

    await flush();
    expect(onStatus).not.toHaveBeenCalledWith('live');
    sse.send(': ping\n\n');
    await flush();
    expect(onStatus).toHaveBeenLastCalledWith('live');
    stream.close();
  });

  it('gives up on a request that never answers', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          )
        )
    );
    const { stream } = open({ connectTimeoutMs: 1000 });

    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(backoff(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no response'));
    stream.close();
  });

  it('gives up on a stream that opens but never sends anything', async () => {
    fetchMock.mockImplementation(async () => sseResponse().response);
    const { stream, onStatus } = open({ connectTimeoutMs: 1000 });

    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(backoff(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onStatus).not.toHaveBeenCalledWith('live');
    stream.close();
  });

  it('reconnects when the heartbeat goes quiet', async () => {
    const first = sseResponse();
    fetchMock
      .mockResolvedValueOnce(first.response)
      .mockImplementation(async () => sseResponse().response);
    const { stream } = open({ heartbeatTimeoutMs: 1000 });

    await flush();
    first.send(': ping\n\n');
    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(backoff(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('heartbeat'));
    stream.close();
  });

  it('resyncs without a resume point and without waiting', async () => {
    const first = sseResponse();
    fetchMock
      .mockResolvedValueOnce(first.response)
      .mockImplementation(async () => sseResponse().response);
    const { stream } = open();

    await flush();
    first.send('id: 3-0\ndata: {}\n\n');
    await flush();
    stream.reconnect({ resync: true });
    await flush();
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentHeaders(1)['Last-Event-ID']).toBeUndefined();
    stream.close();
  });

  it('ignores events after it is closed', async () => {
    const sse = sseResponse();
    fetchMock.mockResolvedValue(sse.response);
    const { stream, onMessage } = open();

    await flush();
    stream.close();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(onMessage).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('backoff', () => {
  it('waits a quarter second, then half a second, then one', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoff(1)).toBe(250);
    expect(backoff(2)).toBe(500);
    expect(backoff(3)).toBe(1000);
    expect(backoff(10)).toBe(1000);
    vi.restoreAllMocks();
  });
});
