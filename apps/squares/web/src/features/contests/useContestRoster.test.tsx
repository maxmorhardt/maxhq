import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { makeParticipant } from '../../test/fixtures';
import type { Participant, ParticipantIdentity } from '../../types/contest';
import { useContestRoster } from './useContestRoster';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

const owner = makeParticipant({ userId: 'u_owner', role: 'owner' });
const pat = makeParticipant({ id: 'p-2', userId: 'u_pat' });
const sam = makeParticipant({ id: 'p-3', userId: 'u_sam' });
const identity = (p: Participant): ParticipantIdentity => ({
  userId: p.userId,
  fullName: p.userId,
});

// answers roster requests one at a time, so a test can hold one in flight
function rosterServer() {
  const pending: ((status: number, body: ParticipantIdentity[]) => void)[] = [];
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
  const answer = async (status: number, players: Participant[]) => {
    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    await act(async () => pending.shift()!(status, players.map(identity)));
  };
  return {
    requests: () => fetchMock.mock.calls.length,
    respond: (players: Participant[]) => answer(200, players),
    fail: () => answer(500, []),
  };
}

function render(isOwner: boolean, participants: Participant[]) {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(({ isOwner, participants }) => useContestRoster('c-1', isOwner, participants), {
    wrapper,
    initialProps: { isOwner, participants },
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

    rerender({ isOwner: false, participants: [owner, pat] });
    expect(result.current).toBeUndefined();
    expect(server.requests()).toBe(1);
  });

  it('retries a refetch that failed, which keeps the old roster', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ isOwner: true, participants: [owner, pat] });
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

    rerender({ isOwner: true, participants: [owner, pat] });
    await server.respond([owner, pat]);
    await waitFor(() => expect(result.current).toHaveLength(2));

    rerender({ isOwner: true, participants: [owner, pat] });
    expect(server.requests()).toBe(2);
  });

  it('asks again for a player who left and rejoined after the roster dropped them', async () => {
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    rerender({ isOwner: true, participants: [owner, pat] });
    await server.respond([owner, pat]);
    await waitFor(() => expect(result.current).toHaveLength(2));

    rerender({ isOwner: true, participants: [owner] });
    rerender({ isOwner: true, participants: [owner, sam] });
    await server.respond([owner, sam]);
    await waitFor(() => expect(result.current?.map((r) => r.userId)).toEqual(['u_owner', 'u_sam']));

    rerender({ isOwner: true, participants: [owner, sam, pat] });
    await server.respond([owner, sam, pat]);
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(server.requests()).toBe(4);
  });

  it('refetches after an in-flight request that missed a later join', async () => {
    const server = rosterServer();
    const { result, rerender } = render(true, [owner]);
    await server.respond([owner]);
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ isOwner: true, participants: [owner, pat] });
    await waitFor(() => expect(server.requests()).toBe(2));
    rerender({ isOwner: true, participants: [owner, pat, sam] });
    await server.respond([owner, pat]);

    await server.respond([owner, pat, sam]);
    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(server.requests()).toBe(3);
  });
});
