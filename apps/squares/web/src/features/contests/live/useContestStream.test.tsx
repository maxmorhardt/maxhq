import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventStreamOptions } from '../../../api/eventStream';
import { makeStore } from '../../../app/store';
import { stubFetch } from '../../../test/api';
import { makeContest, makeQuarterResult } from '../../../test/fixtures';
import type { ContestStatus } from '../../../types/contest';
import { contestsApi } from '../api';
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
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const finished = { contest: makeContest({ status: 'FINISHED' }), participants: [] };

// a contests list that has already loaded this contest with the given status
async function listed(store: ReturnType<typeof makeStore>, status: ContestStatus) {
  stubFetch({ contests: [{ id: 'c-1', status }] });
  await store.dispatch(contestsApi.endpoints.getContestFeed.initiate({}));
}

function setup(contestId: string | undefined = 'c-1', store = makeStore()) {
  const onEvent = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(({ id }) => useContestStream(id, onEvent), {
    wrapper,
    initialProps: { id: contestId },
  });
  const stream = () => streams.options.at(-1)!;
  return { store, onEvent, hook, stream };
}

describe('useContestStream', () => {
  beforeEach(() => {
    streams.options = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the snapshot again when a live stream never sends one', () => {
    vi.useFakeTimers();
    const { stream } = setup();
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

  it('does nothing without a contest', () => {
    setup('');
    expect(streams.options).toHaveLength(0);
  });

  it('reads the contest over http once the stream says it is finished', async () => {
    const fetchMock = respond(200, finished);
    const { store, stream } = setup();
    act(() => stream().onRejected(410));

    await waitFor(() => expect(store.getState().liveContest.contest?.status).toBe('FINISHED'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(streams.options).toHaveLength(1);
    expect(store.getState().liveContest.ended).toBeNull();
  });

  it('records why the server refused the read', async () => {
    respond(404, { message: 'gone' });
    const { store, stream } = setup();
    act(() => stream().onRejected(410));
    await waitFor(() => expect(store.getState().liveContest.ended).toBe('not_found'));
  });

  it('retries a failed read on demand', async () => {
    respond(500, { message: 'down' });
    const { store, stream, hook } = setup();
    act(() => stream().onRejected(410));
    await waitFor(() => expect(store.getState().liveContest.status).toBe('failed'));

    respond(200, finished);
    act(() => hook.result.current.resync());
    await waitFor(() => expect(store.getState().liveContest.contest?.status).toBe('FINISHED'));
    expect(streams.options).toHaveLength(1);
  });

  it('reads a contest the list already shows as finished, without a stream', async () => {
    const store = makeStore();
    await listed(store, 'FINISHED');
    const fetchMock = respond(200, finished);
    setup('c-1', store);

    await waitFor(() => expect(store.getState().liveContest.contest?.status).toBe('FINISHED'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(streams.options).toHaveLength(0);
  });

  it('streams a contest the list shows in play', async () => {
    const store = makeStore();
    await listed(store, 'Q2');
    setup('c-1', store);
    expect(streams.options).toHaveLength(1);
  });

  it('falls back to the stream when reading a listed contest fails', async () => {
    const store = makeStore();
    await listed(store, 'FINISHED');
    respond(404, { message: 'missing' });
    setup('c-1', store);
    await waitFor(() => expect(streams.options).toHaveLength(1));
  });

  it('opens the contest stream and applies events to the store', () => {
    const { store, onEvent, stream } = setup();
    expect(stream().url).toBe(contestEventsUrl('c-1'));

    act(() => stream().onStatus('live'));
    act(() =>
      stream().onMessage(message('contest.snapshot', { contest: makeContest(), participants: [] }))
    );

    expect(store.getState().liveContest).toMatchObject({ contestId: 'c-1', status: 'live' });
    expect(store.getState().liveContest.contest?.name).toBe('Test Bowl');
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'contest.snapshot' }));
  });

  it('records why the server refused the stream', () => {
    const { store, stream } = setup();
    act(() => stream().onRejected(404));
    expect(store.getState().liveContest.ended).toBe('not_found');
    act(() => stream().onRejected(403));
    expect(store.getState().liveContest.ended).toBe('forbidden');
  });

  it('skips unknown events and resyncs after a garbled one', () => {
    const { onEvent, stream } = setup();
    act(() => stream().onMessage(message('contest.renamed')));
    expect(onEvent).not.toHaveBeenCalled();
    expect(streams.handle.reconnect).not.toHaveBeenCalled();

    act(() => stream().onMessage({ id: null, data: '{garbled' }));
    expect(streams.handle.reconnect).toHaveBeenCalledWith({ resync: true });
  });

  it('closes the stream once the contest is gone', () => {
    const { stream } = setup();
    act(() => stream().onMessage(message('contest.deleted')));
    expect(streams.handle.close).toHaveBeenCalled();
  });

  it('closes the stream once the contest finishes', () => {
    const { store, stream } = setup();
    act(() =>
      stream().onMessage(
        message('contest.snapshot', { contest: makeContest({ status: 'Q4' }), participants: [] })
      )
    );
    act(() => stream().onMessage(message('quarter.recorded', makeQuarterResult({ quarter: 4 }))));
    expect(streams.handle.close).not.toHaveBeenCalled();

    const { contest } = store.getState().liveContest;
    act(() =>
      stream().onMessage(message('contest.updated', { ...contest, status: 'FINISHED', version: 2 }))
    );
    expect(streams.handle.close).toHaveBeenCalled();
    expect(store.getState().liveContest.contest?.status).toBe('FINISHED');
  });

  it('closes a stream that resumes onto a finished contest', () => {
    const { stream } = setup();
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

  it('resyncs on demand and cleans up on unmount', () => {
    const { store, hook } = setup();
    hook.result.current.resync();
    expect(streams.handle.reconnect).toHaveBeenCalledWith({ resync: true });

    hook.unmount();
    expect(streams.handle.close).toHaveBeenCalled();
    expect(store.getState().liveContest.contestId).toBeNull();
  });
});
