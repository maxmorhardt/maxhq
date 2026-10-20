import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventStreamOptions } from '../../../api/eventStream';
import { makeStore } from '../../../app/store';
import { makeContest } from '../../../test/fixtures';
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
vi.mock('../../../auth/token', () => ({ getIdToken: vi.fn() }));

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

function setup(contestId: string | undefined = 'c-1') {
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
  return { store, onEvent, hook, stream };
}

describe('useContestStream', () => {
  beforeEach(() => {
    streams.options = [];
    vi.clearAllMocks();
  });

  it('does nothing without a contest', () => {
    setup('');
    expect(streams.options).toHaveLength(0);
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

  it('resyncs on demand and cleans up on unmount', () => {
    const { store, hook } = setup();
    hook.result.current.resync();
    expect(streams.handle.reconnect).toHaveBeenCalledWith({ resync: true });

    hook.unmount();
    expect(streams.handle.close).toHaveBeenCalled();
    expect(store.getState().liveContest.contestId).toBeNull();
  });
});
