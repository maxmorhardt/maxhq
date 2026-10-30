import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventStreamOptions } from '../../../api/eventStream';
import { makeStore } from '../../../app/store';
import { stubFetch } from '../../../test/api';
import { makeContest, makeQuarterResult } from '../../../test/fixtures';
import { contestEventsUrl, useContestStream } from './useContestStream';

const streams = vi.hoisted(() => ({
  options: [] as EventStreamOptions[],
  handle: { reconnect: vi.fn(), close: vi.fn() },
}));

vi.mock('../../../api/eventStream', () => ({
  openEventStream: (options: EventStreamOptions) => {
    streams.options.push(options);
    return streams.handle;
  },
}));
vi.mock('../../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

const message = (type: string, data?: unknown, contestId = 'c-1') => ({
  id: '1-0',
  data: JSON.stringify({
    type,
    contestId,
    updatedBy: 'u',
    timestamp: '2026-01-01T00:00:00Z',
    data,
  }),
});

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
    )
  );
}

// the contest is read over http first; the stream opens only for one still being played
async function setup(contestId: string | undefined = 'c-1', { streams: expected = 1 } = {}) {
  const store = makeStore();
  const onEvent = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(({ id }) => useContestStream(id, onEvent), {
    wrapper,
    initialProps: { id: contestId },
  });
  const stream = () => streams.options.at(-1)!;
  if (expected) {
    await waitFor(() => expect(streams.options).toHaveLength(expected));
  }
  return { store, onEvent, hook, stream };
}

describe('useContestStream', () => {
  beforeEach(() => {
    streams.options = [];
    vi.clearAllMocks();
    stubFetch({ contest: makeContest({ status: 'Q2' }), participants: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the snapshot again when a live stream never sends one', async () => {
    respond(500, { message: 'down' });
    const { stream } = await setup();
    vi.useFakeTimers();
    act(() => stream().onStatus('live'));

    act(() => vi.advanceTimersByTime(4_000));
    expect(streams.handle.reconnect).toHaveBeenCalledWith({ resync: true });

    // once the contest is in, nothing more is asked for
    streams.handle.reconnect.mockClear();
    act(() =>
      stream().onMessage(message('contest.snapshot', { contest: makeContest(), participants: [] }))
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(streams.handle.reconnect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does nothing without a contest', async () => {
    await setup('', { streams: 0 });
    expect(streams.options).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows the contest it read before the stream opens', async () => {
    const { store } = await setup();
    expect(store.getState().liveContest.contest?.status).toBe('Q2');
  });

  it('reads a finished contest once and opens no stream', async () => {
    stubFetch({ contest: makeContest({ status: 'FINISHED' }), participants: [] });
    const { store } = await setup('c-1', { streams: 0 });
    await waitFor(() => expect(store.getState().liveContest.contest?.status).toBe('FINISHED'));
    expect(streams.options).toHaveLength(0);
  });

  it('records why the server refused the read', async () => {
    respond(403, { message: 'no' });
    const { store } = await setup('c-1', { streams: 0 });
    await waitFor(() => expect(store.getState().liveContest.ended).toBe('forbidden'));
    expect(streams.options).toHaveLength(0);
  });

  it('falls back to the stream when the read fails', async () => {
    respond(500, { message: 'down' });
    const { stream } = await setup();
    expect(stream().url).toBe(contestEventsUrl('c-1'));
  });

  it('opens the contest stream and applies events to the store', async () => {
    const { store, onEvent, stream } = await setup();
    expect(stream().url).toBe(contestEventsUrl('c-1'));

    act(() => stream().onStatus('live'));
    act(() =>
      stream().onMessage(message('contest.snapshot', { contest: makeContest(), participants: [] }))
    );

    expect(store.getState().liveContest).toMatchObject({ contestId: 'c-1', status: 'live' });
    expect(store.getState().liveContest.contest?.name).toBe('Test Bowl');
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'contest.snapshot' }));
  });

  it('records why the server refused the stream', async () => {
    const { store, stream } = await setup();
    act(() => stream().onRejected(404));
    expect(store.getState().liveContest.ended).toBe('not_found');
    act(() => stream().onRejected(403));
    expect(store.getState().liveContest.ended).toBe('forbidden');
  });

  it('skips unknown events and resyncs after a garbled one', async () => {
    const { onEvent, stream } = await setup();
    act(() => stream().onMessage(message('contest.renamed')));
    expect(onEvent).not.toHaveBeenCalled();
    expect(streams.handle.reconnect).not.toHaveBeenCalled();

    act(() => stream().onMessage({ id: null, data: '{garbled' }));
    expect(streams.handle.reconnect).toHaveBeenCalledWith({ resync: true });
  });

  it('closes the stream once the contest is gone', async () => {
    const { stream } = await setup();
    act(() => stream().onMessage(message('contest.deleted')));
    expect(streams.handle.close).toHaveBeenCalled();
  });

  it('closes the stream once the contest finishes', async () => {
    const { store, stream } = await setup();
    act(() => stream().onMessage(message('quarter.recorded', makeQuarterResult({ quarter: 4 }))));
    expect(streams.handle.close).not.toHaveBeenCalled();

    const { contest } = store.getState().liveContest;
    act(() =>
      stream().onMessage(message('contest.updated', { ...contest, status: 'FINISHED', version: 2 }))
    );
    expect(streams.handle.close).toHaveBeenCalled();
    expect(store.getState().liveContest.contest?.status).toBe('FINISHED');
  });

  it('closes a stream that resumes onto a finished contest', async () => {
    const { stream } = await setup();
    act(() =>
      stream().onMessage(
        message('contest.snapshot', {
          contest: makeContest({ status: 'FINISHED' }),
          participants: [],
        })
      )
    );
    expect(streams.handle.close).toHaveBeenCalled();
  });

  it('resyncs on demand and cleans up on unmount', async () => {
    const { store, hook } = await setup();
    hook.result.current.resync();
    expect(streams.handle.reconnect).toHaveBeenCalledWith({ resync: true });

    hook.unmount();
    expect(streams.handle.close).toHaveBeenCalled();
    expect(store.getState().liveContest.contestId).toBeNull();
  });
});
