import { describe, it, expect } from 'vitest';
import {
  contestReducer,
  clearError,
  setCurrentContest,
  setCurrentSquare,
  updateContestFromEvent,
  updateSquareFromEvent,
  updateQuarterResultFromEvent,
  rollbackQuarterResultFromEvent,
  addParticipantFromEvent,
  removeParticipantFromEvent,
} from './contestSlice';
import {
  fetchContestFeed,
  createContest,
  claimSquare,
  claimRandomSquaresThunk,
  clearSquare,
  clearMySquares,
  startContestThunk,
  updateContest,
  deleteContest,
  updateQuarterResult,
  rollbackLastQuarterResult,
  fetchParticipants,
  updateContestParticipant,
  removeContestParticipant,
  fetchInvites,
  createContestInvite,
  deleteContestInvite,
} from './contestThunks';
import type {
  Contest,
  Square,
  Participant,
  Invite,
  ContestSummary,
  QuarterResult,
} from '../../types/contest';

const initialState = {
  feed: {
    items: null as ContestSummary[] | null,
    nextCursor: null as string | null,
    loading: false,
    loadingMore: false,
    requestId: null as string | null,
  },
  currentContest: undefined as Contest | null | undefined,
  currentSquare: undefined as Square | null | undefined,
  participants: [] as Participant[],
  invites: [] as Invite[],
  contestLoading: false,
  deleteContestLoading: false,
  squareLoading: false,
  participantsLoading: false,
  invitesLoading: false,
  error: null as string | null,
  squareErrorCode: null as number | null,
};

const mockSummary: ContestSummary = {
  id: 'c1',
  name: 'Test Contest',
  homeTeam: 'Home',
  awayTeam: 'Away',
  status: 'ACTIVE',
  visibility: 'public',
  owner: 'user1',
  role: 'owner',
  claimedSquares: 0,
  mySquares: 0,
  version: 1,
  createdAt: '',
  updatedAt: '',
};

const mockContest: Contest = {
  version: 1,
  id: 'c1',
  name: 'Test Contest',
  xLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  yLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  homeTeam: 'Home',
  awayTeam: 'Away',
  status: 'ACTIVE',
  visibility: 'public',
  squares: [],
  owner: 'user1',
  createdAt: '',
  updatedAt: '',
  createdBy: 'user1',
  updatedBy: 'user1',
};

const mockSquare: Square = {
  version: 1,
  id: 's1',
  contestId: 'c1',
  row: 0,
  col: 0,
  value: 'test',
  owner: 'user1',
  ownerName: 'User 1',
  createdAt: '',
  updatedAt: '',
  createdBy: 'user1',
  updatedBy: 'user1',
};

describe('contestSlice reducers', () => {
  it('should return initial state', () => {
    const state = contestReducer(undefined, { type: 'unknown' });
    expect(state.feed.items).toBeNull();
    expect(state.feed.nextCursor).toBeNull();
    expect(state.error).toBeNull();
    expect(state.contestLoading).toBe(false);
  });

  it('clearError should set error to null', () => {
    const state = contestReducer({ ...initialState, error: 'some error' }, clearError());
    expect(state.error).toBeNull();
  });

  it('setCurrentContest should set the current contest', () => {
    const state = contestReducer(initialState, setCurrentContest(mockContest));
    expect(state.currentContest).toEqual(mockContest);
  });

  it('setCurrentContest should allow null', () => {
    const state = contestReducer(
      { ...initialState, currentContest: mockContest },
      setCurrentContest(null)
    );
    expect(state.currentContest).toBeNull();
  });

  it('setCurrentSquare should set the current square', () => {
    const state = contestReducer(initialState, setCurrentSquare(mockSquare));
    expect(state.currentSquare).toEqual(mockSquare);
  });

  describe('updateContestFromEvent', () => {
    it('should do nothing if no current contest', () => {
      const state = contestReducer(initialState, updateContestFromEvent({ homeTeam: 'New Home' }));
      expect(state.currentContest).toBeUndefined();
    });

    it('should update homeTeam', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromEvent({ homeTeam: 'New Home' })
      );
      expect(state.currentContest?.homeTeam).toBe('New Home');
    });

    it('should update visibility', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, visibility: 'public' } },
        updateContestFromEvent({ visibility: 'private' })
      );
      expect(state.currentContest?.visibility).toBe('private');
    });

    it('should update awayTeam', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromEvent({ awayTeam: 'New Away' })
      );
      expect(state.currentContest?.awayTeam).toBe('New Away');
    });

    it('should update xLabels and yLabels', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromEvent({ xLabels: [9, 8, 7], yLabels: [6, 5, 4] })
      );
      expect(state.currentContest?.xLabels).toEqual([9, 8, 7]);
      expect(state.currentContest?.yLabels).toEqual([6, 5, 4]);
    });

    it('should update status', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromEvent({ status: 'Q1' })
      );
      expect(state.currentContest?.status).toBe('Q1');
    });
  });

  describe('updateSquareFromEvent', () => {
    it('should do nothing if no current contest', () => {
      const state = contestReducer(initialState, updateSquareFromEvent(mockSquare));
      expect(state.currentContest).toBeUndefined();
    });

    it('should update existing square by id', () => {
      const contestWithSquare = { ...mockContest, squares: [mockSquare] };
      const updatedSquare = { ...mockSquare, value: 'updated' };
      const state = contestReducer(
        { ...initialState, currentContest: contestWithSquare },
        updateSquareFromEvent(updatedSquare)
      );
      expect(state.currentContest?.squares[0].value).toBe('updated');
    });

    it('should not add square if id not found', () => {
      const contestWithSquare = { ...mockContest, squares: [mockSquare] };
      const newSquare = { ...mockSquare, id: 'unknown' };
      const state = contestReducer(
        { ...initialState, currentContest: contestWithSquare },
        updateSquareFromEvent(newSquare)
      );
      expect(state.currentContest?.squares).toHaveLength(1);
      expect(state.currentContest?.squares[0].id).toBe('s1');
    });
  });

  describe('updateQuarterResultFromEvent', () => {
    const qrPayload = {
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'user1',
      winnerName: 'User 1',
    };

    it('should do nothing if no current contest', () => {
      const state = contestReducer(initialState, updateQuarterResultFromEvent(qrPayload));
      expect(state.currentContest).toBeUndefined();
    });

    it('should add quarter result and advance status to Q2', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, status: 'Q1', quarterResults: [] } },
        updateQuarterResultFromEvent(qrPayload)
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
      expect(state.currentContest?.quarterResults?.[0].quarter).toBe(1);
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('should advance status through quarters to FINISHED', () => {
      let state: ReturnType<typeof contestReducer> = {
        ...initialState,
        currentContest: {
          ...mockContest,
          status: 'Q1' as const,
          quarterResults: [] as QuarterResult[],
        },
      };
      for (let q = 1; q <= 4; q++) {
        state = contestReducer(state, updateQuarterResultFromEvent({ ...qrPayload, quarter: q }));
      }
      expect(state.currentContest?.quarterResults).toHaveLength(4);
      expect(state.currentContest?.status).toBe('FINISHED');
    });

    it('should initialize quarterResults if undefined', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, quarterResults: undefined } },
        updateQuarterResultFromEvent(qrPayload)
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
    });

    it('should not add duplicate quarter result', () => {
      const existing: QuarterResult = {
        id: '',
        contestId: 'c1',
        quarter: 1,
        homeTeamScore: 14,
        awayTeamScore: 7,
        winnerRow: 4,
        winnerCol: 7,
        winner: 'user1',
        winnerName: 'User 1',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
      };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, quarterResults: [existing] } },
        updateQuarterResultFromEvent(qrPayload)
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
    });
  });

  describe('rollbackQuarterResultFromEvent', () => {
    const q1: QuarterResult = {
      id: 'qr1',
      contestId: 'c1',
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'user1',
      winnerName: 'User 1',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
    };
    const q2: QuarterResult = { ...q1, id: 'qr2', quarter: 2 };

    it('removes the given quarter and reverts to the provided status', () => {
      const state = contestReducer(
        {
          ...initialState,
          currentContest: { ...mockContest, status: 'Q3', quarterResults: [q1, q2] },
        },
        rollbackQuarterResultFromEvent({ quarter: 2, status: 'Q2' })
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
      expect(state.currentContest?.quarterResults?.[0].quarter).toBe(1);
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('falls back to the computed status when none is provided', () => {
      const state = contestReducer(
        {
          ...initialState,
          currentContest: { ...mockContest, status: 'Q3', quarterResults: [q1, q2] },
        },
        rollbackQuarterResultFromEvent({ quarter: 2 })
      );
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('does nothing when there is no current contest', () => {
      const state = contestReducer(
        initialState,
        rollbackQuarterResultFromEvent({ quarter: 2, status: 'Q2' })
      );
      expect(state.currentContest).toBeUndefined();
    });
  });
});

describe('contestSlice extraReducers', () => {
  describe('fetchContestFeed', () => {
    const feedAction = (type: string, payload?: unknown, append = false, cursor?: string) => ({
      type,
      payload,
      meta: { arg: { params: cursor ? { cursor } : {}, append }, requestId: 'r1' },
    });
    const awaiting = { ...initialState.feed, requestId: 'r1' };

    it('pending: a fresh load sets loading and clears the error', () => {
      const state = contestReducer(
        { ...initialState, error: 'old' },
        feedAction(fetchContestFeed.pending.type)
      );
      expect(state.feed.loading).toBe(true);
      expect(state.feed.loadingMore).toBe(false);
      expect(state.error).toBeNull();
    });

    it('pending: a next page sets loadingMore', () => {
      const state = contestReducer(
        initialState,
        feedAction(fetchContestFeed.pending.type, undefined, true)
      );
      expect(state.feed.loadingMore).toBe(true);
      expect(state.feed.loading).toBe(false);
    });

    it('fulfilled: a fresh load replaces the list', () => {
      const state = contestReducer(
        { ...initialState, feed: { ...awaiting, items: [{ ...mockSummary, id: 'old' }] } },
        feedAction(fetchContestFeed.fulfilled.type, { contests: [mockSummary], nextCursor: 'next' })
      );
      expect(state.feed.items).toEqual([mockSummary]);
      expect(state.feed.nextCursor).toBe('next');
      expect(state.feed.loading).toBe(false);
    });

    it('fulfilled: a next page appends and clears a spent cursor', () => {
      const second = { ...mockSummary, id: 'c2' };
      const state = contestReducer(
        {
          ...initialState,
          feed: { ...awaiting, items: [mockSummary], nextCursor: 'next' },
        },
        feedAction(fetchContestFeed.fulfilled.type, { contests: [second] }, true, 'next')
      );
      expect(state.feed.items?.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(state.feed.nextCursor).toBeNull();
    });

    it('fulfilled: drops a next page for a list that was replaced meanwhile', () => {
      const state = contestReducer(
        {
          ...initialState,
          feed: { ...awaiting, items: [mockSummary], nextCursor: 'fresh', loadingMore: true },
        },
        feedAction(
          fetchContestFeed.fulfilled.type,
          { contests: [{ ...mockSummary, id: 'x' }] },
          true,
          'old'
        )
      );
      expect(state.feed.items?.map((c) => c.id)).toEqual(['c1']);
      expect(state.feed.nextCursor).toBe('fresh');
      expect(state.feed.loadingMore).toBe(false);
    });

    it('fulfilled: drops a replacement that a newer request superseded', () => {
      const state = contestReducer(
        {
          ...initialState,
          feed: { ...initialState.feed, items: [mockSummary], requestId: 'r2', loading: true },
        },
        feedAction(fetchContestFeed.fulfilled.type, { contests: [] })
      );
      expect(state.feed.items).toEqual([mockSummary]);
      expect(state.feed.loading).toBe(true);
    });

    it('rejected: settles the list and sets the error', () => {
      const state = contestReducer(
        initialState,
        feedAction(fetchContestFeed.rejected.type, { message: 'fail' })
      );
      expect(state.feed.items).toEqual([]);
      expect(state.error).toBe('fail');
    });

    it('rejected: uses default error message', () => {
      const state = contestReducer(initialState, feedAction(fetchContestFeed.rejected.type));
      expect(state.error).toBe('Error fetching contests');
    });
  });

  describe('createContest', () => {
    it('pending: sets loading', () => {
      const state = contestReducer(initialState, {
        type: createContest.pending.type,
      });
      expect(state.contestLoading).toBe(true);
    });

    it('fulfilled: clears loading', () => {
      const state = contestReducer(
        { ...initialState, contestLoading: true },
        { type: createContest.fulfilled.type, payload: mockContest }
      );
      expect(state.contestLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: createContest.rejected.type,
        payload: { message: 'create fail' },
      });
      expect(state.error).toBe('create fail');
    });
  });

  describe('claimSquare', () => {
    it('pending: sets squareLoading', () => {
      const state = contestReducer(initialState, {
        type: claimSquare.pending.type,
      });
      expect(state.squareLoading).toBe(true);
    });

    it('fulfilled: updates existing square by row/col', () => {
      const contestWithSquare = { ...mockContest, squares: [mockSquare] };
      const updated = { ...mockSquare, value: 'new' };
      const state = contestReducer(
        { ...initialState, currentContest: contestWithSquare },
        { type: claimSquare.fulfilled.type, payload: updated }
      );
      expect(state.currentContest?.squares[0].value).toBe('new');
      expect(state.squareLoading).toBe(false);
    });

    it('fulfilled: pushes new square if not found', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [] } },
        { type: claimSquare.fulfilled.type, payload: mockSquare }
      );
      expect(state.currentContest?.squares).toHaveLength(1);
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: claimSquare.fulfilled.type,
        payload: mockSquare,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: claimSquare.rejected.type,
        payload: { message: 'square error' },
      });
      expect(state.error).toBe('square error');
      expect(state.squareLoading).toBe(false);
    });
  });

  describe('claimRandomSquaresThunk', () => {
    it('fulfilled: applies newer claimed squares to the grid', () => {
      const stale = { ...mockSquare, id: 'sq-a', version: 1, value: '' };
      const other = { ...mockSquare, id: 'sq-b', version: 5, value: 'OLD' };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [stale, other] } },
        {
          type: claimRandomSquaresThunk.fulfilled.type,
          payload: {
            squares: [
              { ...stale, version: 2, value: 'ME' },
              { ...other, version: 4, value: 'ME' },
            ],
            requested: 2,
          },
        }
      );
      expect(state.currentContest?.squares.map((s) => s.value)).toEqual(['ME', 'OLD']);
    });

    it('fulfilled: ignores a response without a current contest', () => {
      const state = contestReducer(initialState, {
        type: claimRandomSquaresThunk.fulfilled.type,
        payload: { squares: [mockSquare], requested: 1 },
      });
      expect(state.currentContest).toBeUndefined();
    });
  });

  describe('clearSquare', () => {
    it('fulfilled: updates existing square', () => {
      const cleared = { ...mockSquare, value: '', owner: '' };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [mockSquare] } },
        { type: clearSquare.fulfilled.type, payload: cleared }
      );
      expect(state.currentContest?.squares[0].value).toBe('');
      expect(state.squareLoading).toBe(false);
    });

    it('fulfilled: does nothing if square not found', () => {
      const cleared = { ...mockSquare, row: 9, col: 9 };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [mockSquare] } },
        { type: clearSquare.fulfilled.type, payload: cleared }
      );
      expect(state.currentContest?.squares[0].value).toBe('test');
    });
  });

  describe('clearMySquares', () => {
    it('fulfilled: clears each returned square by id', () => {
      const other: Square = {
        ...mockSquare,
        id: 's2',
        row: 1,
        col: 1,
        value: 'CD',
        owner: 'other',
      };
      const clearedMine = { ...mockSquare, value: '', owner: '', ownerName: '' };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [mockSquare, other] } },
        { type: clearMySquares.fulfilled.type, payload: [clearedMine] }
      );
      expect(state.currentContest?.squares[0].value).toBe('');
      // squares owned by others are untouched
      expect(state.currentContest?.squares[1].value).toBe('CD');
      expect(state.squareLoading).toBe(false);
    });

    it('rejected: sets error message', () => {
      const state = contestReducer(
        { ...initialState, squareLoading: true },
        { type: clearMySquares.rejected.type, payload: { message: 'boom' } }
      );
      expect(state.squareLoading).toBe(false);
      expect(state.error).toBe('boom');
    });
  });

  describe('startContestThunk', () => {
    it('fulfilled: updates current contest', () => {
      const started = { ...mockContest, status: 'Q1' as const };
      const state = contestReducer(
        { ...initialState, currentContest: mockContest },
        { type: startContestThunk.fulfilled.type, payload: started }
      );
      expect(state.currentContest?.status).toBe('Q1');
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: startContestThunk.fulfilled.type,
        payload: mockContest,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: startContestThunk.rejected.type,
        payload: { message: 'start fail' },
      });
      expect(state.error).toBe('start fail');
    });
  });

  describe('updateContest', () => {
    it('fulfilled: updates currentContest if same id', () => {
      const updated = { ...mockContest, homeTeam: 'Updated Home' };
      const state = contestReducer(
        { ...initialState, currentContest: mockContest },
        { type: updateContest.fulfilled.type, payload: updated }
      );
      expect(state.currentContest?.homeTeam).toBe('Updated Home');
    });

    it('fulfilled: updates the matching feed row', () => {
      const updated = { ...mockContest, homeTeam: 'Updated Home', version: 2 };
      const state = contestReducer(
        { ...initialState, feed: { ...initialState.feed, items: [mockSummary] } },
        { type: updateContest.fulfilled.type, payload: updated }
      );
      expect(state.feed.items?.[0]?.homeTeam).toBe('Updated Home');
      expect(state.feed.items?.[0]?.version).toBe(2);
      expect(state.feed.items?.[0]?.role).toBe('owner');
    });
  });

  describe('deleteContest', () => {
    it('pending: sets deleteContestLoading', () => {
      const state = contestReducer(initialState, {
        type: deleteContest.pending.type,
      });
      expect(state.deleteContestLoading).toBe(true);
    });

    it('fulfilled: removes contest and clears current', () => {
      const state = contestReducer(
        {
          ...initialState,
          feed: { ...initialState.feed, items: [mockSummary] },
          currentContest: mockContest,
        },
        { type: deleteContest.fulfilled.type, meta: { arg: 'c1' } }
      );
      expect(state.feed.items).toHaveLength(0);
      expect(state.currentContest).toBeNull();
      expect(state.deleteContestLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: deleteContest.rejected.type,
        payload: { message: 'delete fail' },
      });
      expect(state.error).toBe('delete fail');
      expect(state.deleteContestLoading).toBe(false);
    });
  });

  describe('updateQuarterResult', () => {
    const qr: QuarterResult = {
      id: 'qr1',
      contestId: 'c1',
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'user1',
      winnerName: 'User 1',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
    };

    it('fulfilled: adds quarter result and advances status', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, status: 'Q1', quarterResults: [] } },
        { type: updateQuarterResult.fulfilled.type, payload: qr }
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('fulfilled: does not add duplicate quarter', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, quarterResults: [qr] } },
        { type: updateQuarterResult.fulfilled.type, payload: qr }
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: updateQuarterResult.fulfilled.type,
        payload: qr,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: updateQuarterResult.rejected.type,
        payload: { message: 'qr fail' },
      });
      expect(state.error).toBe('qr fail');
    });
  });

  describe('rollbackLastQuarterResult', () => {
    const qr: QuarterResult = {
      id: 'qr2',
      contestId: 'c1',
      quarter: 2,
      homeTeamScore: 21,
      awayTeamScore: 10,
      winnerRow: 1,
      winnerCol: 0,
      winner: 'user1',
      winnerName: 'User 1',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
    };
    const qr1: QuarterResult = { ...qr, id: 'qr1', quarter: 1 };

    it('fulfilled: removes the quarter and reverts status', () => {
      const state = contestReducer(
        {
          ...initialState,
          currentContest: { ...mockContest, status: 'Q3', quarterResults: [qr1, qr] },
        },
        { type: rollbackLastQuarterResult.fulfilled.type, payload: qr }
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
      expect(state.currentContest?.quarterResults?.[0].quarter).toBe(1);
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: rollbackLastQuarterResult.fulfilled.type,
        payload: qr,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: rollbackLastQuarterResult.rejected.type,
        payload: { message: 'rollback fail' },
      });
      expect(state.error).toBe('rollback fail');
    });
  });

  describe('fetchParticipants', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('pending: sets participantsLoading', () => {
      const state = contestReducer(initialState, {
        type: fetchParticipants.pending.type,
      });
      expect(state.participantsLoading).toBe(true);
    });

    it('fulfilled: sets participants', () => {
      const state = contestReducer(initialState, {
        type: fetchParticipants.fulfilled.type,
        payload: [mockParticipant],
      });
      expect(state.participants).toHaveLength(1);
      expect(state.participantsLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchParticipants.rejected.type,
        payload: { message: 'participants fail' },
      });
      expect(state.error).toBe('participants fail');
    });
  });

  describe('updateContestParticipant', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('fulfilled: updates participant in list', () => {
      const updated = { ...mockParticipant, maxSquares: 20 };
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        { type: updateContestParticipant.fulfilled.type, payload: updated }
      );
      expect(state.participants[0].maxSquares).toBe(20);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: updateContestParticipant.rejected.type,
        payload: { message: 'update participant fail' },
      });
      expect(state.error).toBe('update participant fail');
    });
  });

  describe('removeContestParticipant', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('fulfilled: removes participant by userId', () => {
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        { type: removeContestParticipant.fulfilled.type, payload: 'u1' }
      );
      expect(state.participants).toHaveLength(0);
    });

    it('rejected: leaves the global error untouched (surfaced in the dialog instead)', () => {
      const state = contestReducer(initialState, {
        type: removeContestParticipant.rejected.type,
        payload: { message: 'remove fail' },
      });
      expect(state.error).toBeNull();
    });
  });

  describe('addParticipantFromEvent', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('adds a new participant', () => {
      const state = contestReducer(initialState, addParticipantFromEvent(mockParticipant));
      expect(state.participants).toHaveLength(1);
      expect(state.participants[0].id).toBe('p1');
    });

    it('de-dupes if participant already exists', () => {
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        addParticipantFromEvent(mockParticipant)
      );
      expect(state.participants).toHaveLength(1);
    });
  });

  describe('removeParticipantFromEvent', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('removes participant by userId', () => {
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        removeParticipantFromEvent('u1')
      );
      expect(state.participants).toHaveLength(0);
    });

    it('no-ops when userId does not match', () => {
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        removeParticipantFromEvent('u999')
      );
      expect(state.participants).toHaveLength(1);
    });
  });

  describe('fetchInvites', () => {
    const mockInvite: Invite = {
      id: 'i1',
      contestId: 'c1',
      token: 'tok',
      maxSquares: 10,
      role: 'participant',
      uses: 0,
      createdAt: '',
      createdBy: '',
      updatedAt: '',
    };

    it('pending: sets invitesLoading', () => {
      const state = contestReducer(initialState, {
        type: fetchInvites.pending.type,
      });
      expect(state.invitesLoading).toBe(true);
    });

    it('fulfilled: sets invites', () => {
      const state = contestReducer(initialState, {
        type: fetchInvites.fulfilled.type,
        payload: [mockInvite],
      });
      expect(state.invites).toHaveLength(1);
      expect(state.invitesLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchInvites.rejected.type,
        payload: { message: 'invites fail' },
      });
      expect(state.error).toBe('invites fail');
    });
  });

  describe('createContestInvite', () => {
    it('fulfilled: prepends the new invite without refetching', () => {
      const newInvite: Invite = {
        id: 'i2',
        contestId: 'c1',
        token: 'newtok',
        maxSquares: 5,
        role: 'participant',
        uses: 0,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
      };
      const existingInvite: Invite = {
        id: 'i1',
        contestId: 'c1',
        token: 'tok',
        maxSquares: 10,
        role: 'participant',
        uses: 0,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
      };

      const state = contestReducer(
        { ...initialState, invites: [existingInvite] },
        { type: createContestInvite.fulfilled.type, payload: newInvite }
      );

      expect(state.invites).toEqual([newInvite, existingInvite]);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: createContestInvite.rejected.type,
        payload: { message: 'invite create fail' },
      });
      expect(state.error).toBe('invite create fail');
    });
  });

  describe('deleteContestInvite', () => {
    const mockInvite: Invite = {
      id: 'i1',
      contestId: 'c1',
      token: 'tok',
      maxSquares: 10,
      role: 'participant',
      uses: 0,
      createdAt: '',
      createdBy: '',
      updatedAt: '',
    };

    it('fulfilled: removes invite by id', () => {
      const state = contestReducer(
        { ...initialState, invites: [mockInvite] },
        { type: deleteContestInvite.fulfilled.type, payload: 'i1' }
      );
      expect(state.invites).toHaveLength(0);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: deleteContestInvite.rejected.type,
        payload: { message: 'invite delete fail' },
      });
      expect(state.error).toBe('invite delete fail');
    });
  });
});
