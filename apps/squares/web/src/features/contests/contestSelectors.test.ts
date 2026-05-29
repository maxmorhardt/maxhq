import { describe, it, expect } from 'vitest';
import {
  selectContests,
  selectMyContests,
  selectCurrentContest,
  selectCurrentSquare,
  selectParticipants,
  selectInvites,
  selectContestLoading,
  selectSquareLoading,
  selectParticipantsLoading,
  selectInvitesLoading,
  selectContestError,
  selectContestPagination,
  selectDeleteContestLoading,
  selectSquareErrorCode,
} from './contestSelectors';
import type { Contest, Square, Participant, Invite } from '../../types/contest';

const mockContest: Contest = {
  id: 'c1',
  name: 'Test Contest',
  owner: 'user1',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
  xLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  yLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  status: 'ACTIVE',
  squares: [],
  quarterResults: [],
  visibility: 'private',
};

const mockSquare: Square = {
  id: 'sq1',
  contestId: 'c1',
  row: 0,
  col: 0,
  value: 'Alice',
  owner: 'user1',
  ownerName: 'Alice Smith',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

const mockParticipant: Participant = {
  id: 'p1',
  contestId: 'c1',
  userId: 'user1',
  inviteId: 'inv1',
  role: 'participant',
  maxSquares: 10,
  joinedAt: '',
  createdAt: '',
  updatedAt: '',
};

const mockInvite: Invite = {
  id: 'inv1',
  contestId: 'c1',
  token: 'tok1',
  maxSquares: 10,
  role: 'participant',
  uses: 0,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
};

const defaultPagination = {
  page: 1,
  limit: 5,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

// construct a minimal state shape that satisfies the selectors' RootState expectations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeState = (overrides: Record<string, unknown> = {}): any => ({
  contest: {
    contests: [],
    myContests: [],
    currentContest: undefined,
    currentSquare: undefined,
    participants: [],
    invites: [],
    contestLoading: false,
    deleteContestLoading: false,
    squareLoading: false,
    squareErrorCode: null,
    participantsLoading: false,
    invitesLoading: false,
    error: null,
    pagination: defaultPagination,
    ...overrides,
  },
});

describe('contestSelectors', () => {
  it('selectContests returns the contests array', () => {
    const state = makeState({ contests: [mockContest] });
    expect(selectContests(state)).toEqual([mockContest]);
  });

  it('selectMyContests returns the myContests array', () => {
    const state = makeState({ myContests: [mockContest] });
    expect(selectMyContests(state)).toEqual([mockContest]);
  });

  it('selectCurrentContest returns the current contest', () => {
    const state = makeState({ currentContest: mockContest });
    expect(selectCurrentContest(state)).toEqual(mockContest);
  });

  it('selectCurrentSquare returns the current square', () => {
    const state = makeState({ currentSquare: mockSquare });
    expect(selectCurrentSquare(state)).toEqual(mockSquare);
  });

  it('selectParticipants returns the participants array', () => {
    const state = makeState({ participants: [mockParticipant] });
    expect(selectParticipants(state)).toEqual([mockParticipant]);
  });

  it('selectInvites returns the invites array', () => {
    const state = makeState({ invites: [mockInvite] });
    expect(selectInvites(state)).toEqual([mockInvite]);
  });

  it('selectContestLoading returns the contestLoading flag', () => {
    expect(selectContestLoading(makeState({ contestLoading: true }))).toBe(true);
    expect(selectContestLoading(makeState({ contestLoading: false }))).toBe(false);
  });

  it('selectSquareLoading returns the squareLoading flag', () => {
    expect(selectSquareLoading(makeState({ squareLoading: true }))).toBe(true);
    expect(selectSquareLoading(makeState({ squareLoading: false }))).toBe(false);
  });

  it('selectParticipantsLoading returns the participantsLoading flag', () => {
    expect(selectParticipantsLoading(makeState({ participantsLoading: true }))).toBe(true);
    expect(selectParticipantsLoading(makeState({ participantsLoading: false }))).toBe(false);
  });

  it('selectInvitesLoading returns the invitesLoading flag', () => {
    expect(selectInvitesLoading(makeState({ invitesLoading: true }))).toBe(true);
    expect(selectInvitesLoading(makeState({ invitesLoading: false }))).toBe(false);
  });

  it('selectContestError returns the error string', () => {
    const state = makeState({ error: 'Something went wrong' });
    expect(selectContestError(state)).toBe('Something went wrong');
  });

  it('selectContestPagination returns the pagination object', () => {
    const pagination = {
      page: 2,
      limit: 10,
      total: 20,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    };
    const state = makeState({ pagination });
    expect(selectContestPagination(state)).toEqual(pagination);
  });

  it('selectDeleteContestLoading returns the deleteContestLoading flag', () => {
    expect(selectDeleteContestLoading(makeState({ deleteContestLoading: true }))).toBe(true);
    expect(selectDeleteContestLoading(makeState({ deleteContestLoading: false }))).toBe(false);
  });

  it('selectSquareErrorCode returns the squareErrorCode', () => {
    expect(selectSquareErrorCode(makeState({ squareErrorCode: 409 }))).toBe(409);
    expect(selectSquareErrorCode(makeState({ squareErrorCode: null }))).toBeNull();
  });
});
