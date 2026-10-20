import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventStreamOptions } from '../../api/eventStream';
import { makeStore } from '../../app/store';
import type { Game, Scoreboard } from '../../types/contest';
import { gamesApi } from './api';
import { gamesEventsUrl, useGamesStream } from './useGamesStream';

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

async function setup() {
  const store = makeStore();
  const board: Scoreboard = { season: 2026, seasonType: 2, week: 7, games: [game({})] };
  await store.dispatch(gamesApi.util.upsertQueryData('getScoreboard', undefined, board));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => useGamesStream(undefined), { wrapper });
  const stream = () => streams.options.at(-1)!;
  const cached = () => gamesApi.endpoints.getScoreboard.select(undefined)(store.getState()).data;
  return { hook, stream, cached };
}

const send = (stream: EventStreamOptions, data: string) =>
  act(() => stream.onMessage({ id: '1-0', data }));

describe('useGamesStream', () => {
  beforeEach(() => {
    streams.options = [];
    vi.clearAllMocks();
  });

  it('opens the public games stream without a token', async () => {
    const { stream } = await setup();
    expect(stream().url).toBe(gamesEventsUrl);
    await expect(stream().getToken()).resolves.toBeNull();
  });

  it('moves the score of a cached game and ignores older updates', async () => {
    const { stream, cached } = await setup();

    send(
      stream(),
      JSON.stringify({ game: game({ homeScore: 7, updatedAt: '2026-10-25T18:00:00Z' }) })
    );
    expect(cached()?.games[0].homeScore).toBe(7);

    send(
      stream(),
      JSON.stringify({ game: game({ homeScore: 3, updatedAt: '2026-10-25T17:30:00Z' }) })
    );
    expect(cached()?.games[0].homeScore).toBe(7);
  });

  it('skips unreadable messages and games from other weeks', async () => {
    const { stream, cached } = await setup();

    send(stream(), 'not json');
    send(stream(), JSON.stringify({ game: game({ id: 'g-9', homeScore: 21 }) }));

    expect(cached()?.games).toEqual([game({})]);
  });

  it('reports the stream status and closes on unmount', async () => {
    const { hook, stream } = await setup();

    act(() => stream().onStatus('live'));
    expect(hook.result.current).toBe('live');
    act(() => stream().onRejected(404));
    expect(hook.result.current).toBe('failed');

    hook.unmount();
    expect(streams.handle.close).toHaveBeenCalled();
  });
});
