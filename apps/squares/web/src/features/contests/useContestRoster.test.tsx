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
  const pending: ((body: ParticipantIdentity[]) => void)[] = [];
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        pending.push((body) =>
          resolve(
            new Response(JSON.stringify(body), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          )
        );
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  const respond = async (players: Participant[]) => {
    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    await act(async () => pending.shift()!(players.map(identity)));
  };
  return { requests: () => fetchMock.mock.calls.length, respond };
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
    vi.unstubAllGlobals();
  });

  it('never asks for a roster the viewer cannot see', () => {
    const server = rosterServer();
    const { result } = render(false, [owner, pat]);
    expect(result.current).toBeUndefined();
    expect(server.requests()).toBe(0);
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
