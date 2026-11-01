import { getContestViewer, type ContestViewer } from '../features/contests/live/viewer';
import type { Contest, Participant, QuarterResult, Square } from '../types/contest';

export function makeSquare(overrides: Partial<Square> = {}): Square {
  return {
    id: 'sq-0-0',
    contestId: 'c-1',
    row: 0,
    col: 0,
    value: '',
    owner: '',
    ownerName: '',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// a size x size grid, every square empty unless claimed lists it
export function makeContest(overrides: Partial<Contest> = {}, size = 3): Contest {
  const squares = Array.from({ length: size * size }, (_, i) =>
    makeSquare({
      id: `sq-${Math.floor(i / size)}-${i % size}`,
      row: Math.floor(i / size),
      col: i % size,
    })
  );
  return {
    id: 'c-1',
    name: 'Test Bowl',
    xLabels: Array.from({ length: size }, (_, i) => i),
    yLabels: Array.from({ length: size }, (_, i) => i),
    homeTeam: 'Home',
    awayTeam: 'Away',
    status: 'ACTIVE',
    visibility: 'private',
    squares,
    quarterResults: [],
    owner: 'u_owner',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'p-1',
    contestId: 'c-1',
    userId: 'u_player',
    displayName: 'Pat P.',
    inviteId: '',
    role: 'participant',
    maxSquares: 5,
    joinedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeQuarterResult(overrides: Partial<QuarterResult> = {}): QuarterResult {
  return {
    id: 'qr-1',
    contestId: 'c-1',
    quarter: 1,
    homeTeamScore: 7,
    awayTeamScore: 3,
    winnerRow: 1,
    winnerCol: 2,
    winner: 'u_player',
    winnerName: 'Player',
    createdAt: '2026-01-01T01:00:00Z',
    updatedAt: '2026-01-01T01:00:00Z',
    ...overrides,
  };
}

// pass viewerId to sign in as someone else; isMe follows it
export function makeViewer({
  viewerId = 'u_player',
  ...overrides
}: Partial<ContestViewer> = {}): ContestViewer {
  const { isMe, fullName } = getContestViewer(viewerId, makeContest(), []);
  return {
    viewerId,
    isMe,
    fullName,
    participant: makeParticipant(),
    isOwner: false,
    isParticipant: true,
    squaresClaimed: 0,
    squaresLeft: 5,
    ...overrides,
  };
}
