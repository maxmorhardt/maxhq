import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { makePlayer } from '../../test/fixtures';
import type { Player, PlayerIdentity } from '../../types/contest';
import { useContestRoster } from './useContestRoster';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

const owner = makePlayer({ userId: 'u_owner', role: 'owner' });
const pat = makePlayer({ id: 'p-2', userId: 'u_pat' });
const sam = makePlayer({ id: 'p-3', userId: 'u_sam' });
const identity = (p: Player): PlayerIdentity => ({
  userId: p.userId,
  fullName: p.userId,
});

// answers roster requests one at a time, so a test can hold one in flight
function rosterServer() {
  const pending: ((status: number, body: PlayerIdentity[]) => void)[] = [];
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        pending.push((status, body) =>
          resolve(
            new Response(JSON.stringify(body), {
              status,
              headers: { 'Content-Type': 'application/json' },
            })
          )
        );
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  const answer = async (status: number, players: Player[]) => {
    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    await act(async () => pending.shift()!(status, players.map(identity)));
  };
  return {
    requests: () => fetchMock.mock.calls.length,
    respond: (players: Player[]) => answer(200, players),
    fail: () => answer(500, []),
  };
}

function render(isOwner: boolean, players: Player[]) {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(({ isOwner, players }) => useContestRoster('c-1', isOwner, players), {
    wrapper,
    initialProps: { isOwner, players },
  });
}

describe('useContestRoster', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('never asks for a roster the viewer cannot see', () => {
    const server = rosterServer();
    const { result } = render(false, [owner, pat]);
    expect(result.current).toBeUndefined();
    expect(server.requests()).toBe(0);
  });

  it('drops the roster once the viewer is no longer the owner', async () => {
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ isOwner: false, players: [owner, pat] });
    expect(result.current).toBeUndefined();
    expect(server.requests()).toBe(1);
  });

  it('retries a refetch that failed, which keeps the old roster', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ isOwner: true, players: [owner, pat] });
    await server.fail();
    expect(result.current).toHaveLength(1);
    expect(server.requests()).toBe(2);

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    await server.respond([owner, pat]);
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(server.requests()).toBe(3);
  });

  it('refetches once when someone the roster lacks joins', async () => {
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ isOwner: true, players: [owner, pat] });
    await server.respond([owner, pat]);
    await waitFor(() => expect(result.current).toHaveLength(2));

    rerender({ isOwner: true, players: [owner, pat] });
    expect(server.requests()).toBe(2);
  });

  it('asks again for a player who left and rejoined after the roster dropped them', async () => {
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    rerender({ isOwner: true, players: [owner, pat] });
    await server.respond([owner, pat]);
    await waitFor(() => expect(result.current).toHaveLength(2));

    rerender({ isOwner: true, players: [owner] });
    rerender({ isOwner: true, players: [owner, sam] });
    await server.respond([owner, sam]);
    await waitFor(() => expect(result.current?.map((r) => r.userId)).toEqual(['u_owner', 'u_sam']));

    rerender({ isOwner: true, players: [owner, sam, pat] });
    await server.respond([owner, sam, pat]);
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(server.requests()).toBe(4);
  });

  it('refetches after an in-flight request that missed a later join', async () => {
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ isOwner: true, players: [owner, pat] });
    await waitFor(() => expect(server.requests()).toBe(2));
    rerender({ isOwner: true, players: [owner, pat, sam] });
    await server.respond([owner, pat]);

    await server.respond([owner, pat, sam]);
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(server.requests()).toBe(3);
  });
});
