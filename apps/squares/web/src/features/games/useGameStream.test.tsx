import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventStreamOptions } from '../../api/eventStream';
import { makeStore } from '../../app/store';
import type { Game } from '../../types/contest';
import { gamesApi } from './api';
import { gameEventsUrl, useGameStream } from './useGameStream';

const streams = vi.hoisted(() => ({
  options: [] as EventStreamOptions[],
  handle: { reconnect: vi.fn(), close: vi.fn() },
}));

vi.mock('../../api/eventStream', () => ({
  openEventStream: (options: EventStreamOptions) => {
    streams.options.push(options);
    return streams.handle;
  },
}));

const game = (overrides: Partial<Game>) =>
  ({ id: 'g-1', homeScore: 0, updatedAt: '2026-10-25T17:00:00Z', ...overrides }) as Game;

async function setup(gameId: string | undefined) {
  const store = makeStore();
  await store.dispatch(gamesApi.util.upsertQueryData('getGame', 'g-1', game({})));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => useGameStream(gameId), { wrapper });
  const stream = () => streams.options.at(-1)!;
  const cached = () => gamesApi.endpoints.getGame.select('g-1')(store.getState()).data;
  return { hook, stream, cached };
}

const send = (stream: EventStreamOptions, data: string) =>
  act(() => stream.onMessage({ id: '1-0', data }));

describe('useGameStream', () => {
  beforeEach(() => {
    streams.options = [];
    vi.clearAllMocks();
  });

  it('opens the public stream for the one game without a token', async () => {
    const { stream } = await setup('g-1');
    expect(stream().url).toBe(gameEventsUrl('g-1'));
    await expect(stream().getToken()).resolves.toBeNull();
  });

  it('moves the cached score and ignores older updates', async () => {
    const { stream, cached } = await setup('g-1');

    send(
      stream(),
      JSON.stringify({ game: game({ homeScore: 7, updatedAt: '2026-10-25T18:00:00Z' }) })
    );
    expect(cached()?.homeScore).toBe(7);

    send(
      stream(),
      JSON.stringify({ game: game({ homeScore: 3, updatedAt: '2026-10-25T17:30:00Z' }) })
    );
    expect(cached()?.homeScore).toBe(7);
  });

  it('skips unreadable messages and other games', async () => {
    const { stream, cached } = await setup('g-1');

    send(stream(), 'not json');
    send(stream(), JSON.stringify({ game: game({ id: 'g-9', homeScore: 21 }) }));

    expect(cached()).toEqual(game({}));
  });

  it('stays closed without a game', async () => {
    const { hook } = await setup(undefined);
    expect(streams.options).toHaveLength(0);
    expect(hook.result.current).toBeNull();
  });

  it('reports the stream status and closes on unmount', async () => {
    const { hook, stream } = await setup('g-1');

    act(() => stream().onStatus('live'));
    expect(hook.result.current).toBe('live');
    act(() => stream().onRejected(404));
    expect(hook.result.current).toBe('failed');

    hook.unmount();
    expect(streams.handle.close).toHaveBeenCalled();
  });
});
