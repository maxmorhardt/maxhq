import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type {
  Contest,
  ContestStatus,
  Invite,
  PaginatedContestsResponse,
  Participant,
  QuarterResult,
  Square,
} from '../../types/contest';
import {
  clearSquare,
  createContest,
  createContestInvite,
  deleteContest,
  deleteContestInvite,
  fetchContestsByOwner,
  fetchInvites,
  fetchMyContests,
  fetchParticipants,
  removeContestParticipant,
  startContestThunk,
  updateContest,
  updateContestParticipant,
  updateQuarterResult,
  updateSquare,
} from './contestThunks';

// redux state for contest management
interface ContestState {
  contests: Contest[]; // list of user's contests
  myContests: Contest[]; // contests where user is a participant
  currentContest?: Contest | null; // currently viewed contest
  currentSquare?: Square | null; // currently selected square
  participants: Participant[]; // participants for current contest
  invites: Invite[]; // invites for current contest
  contestLoading: boolean; // loading state for contest operations
  deleteContestLoading: boolean; // loading state for delete operation
  squareLoading: boolean; // loading state for square operations
  squareErrorCode: number | null; // HTTP status code from last square error
  participantsLoading: boolean; // loading state for participants
  invitesLoading: boolean; // loading state for invites
  error: string | null; // error message
  pagination: {
    // pagination info for contests list
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

const initialState: ContestState = {
  contests: [],
  myContests: [],
  participants: [],
  invites: [],
  contestLoading: false,
  deleteContestLoading: false,
  squareLoading: false,
  squareErrorCode: null,
  participantsLoading: false,
  invitesLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  },
};

const contestSlice = createSlice({
  name: 'contests',
  initialState,
  reducers: {
    // clear error state
    clearError(state) {
      state.error = null;
    },
    // clear square error code (after handling e.g. 409)
    clearSquareErrorCode(state) {
      state.squareErrorCode = null;
    },
    // set the currently viewed contest
    setCurrentContest(state, action: PayloadAction<Contest | null>) {
      state.currentContest = action.payload;
    },
    // directly set participants (used on WS connected message)
    setParticipants(state, action: PayloadAction<Participant[]>) {
      state.participants = action.payload;
    },
    // set the currently selected square for editing
    setCurrentSquare(state, action: PayloadAction<Square>) {
      state.currentSquare = action.payload;
    },
    // update contest fields from websocket message
    updateContestFromWebSocket(
      state,
      action: PayloadAction<{
        xLabels?: number[];
        yLabels?: number[];
        homeTeam?: string;
        awayTeam?: string;
        status?: ContestStatus;
      }>
    ) {
      if (!state.currentContest) {
        return;
      }

      const { xLabels, yLabels, homeTeam, awayTeam, status } = action.payload;
      if (xLabels !== undefined) {
        state.currentContest.xLabels = xLabels;
      }

      if (yLabels !== undefined) {
        state.currentContest.yLabels = yLabels;
      }

      if (homeTeam !== undefined) {
        state.currentContest.homeTeam = homeTeam;
      }

      if (awayTeam !== undefined) {
        state.currentContest.awayTeam = awayTeam;
      }

      if (status !== undefined) {
        state.currentContest.status = status;
      }
    },
    // update square from websocket message (full square object)
    updateSquareFromWebSocket(state, action: PayloadAction<Square>) {
      if (!state.currentContest) {
        return;
      }

      const updatedSquare = action.payload;

      const squareIndex = state.currentContest.squares.findIndex(
        (square) => square.id === updatedSquare.id
      );
      if (squareIndex !== -1) {
        state.currentContest.squares[squareIndex] = updatedSquare;
      }
    },
    // add or update quarter result from websocket, update contest status
    updateQuarterResultFromWebSocket(
      state,
      action: PayloadAction<{
        quarter: number;
        homeTeamScore: number;
        awayTeamScore: number;
        winnerRow: number;
        winnerCol: number;
        winner: string;
        winnerName: string;
      }>
    ) {
      if (!state.currentContest) {
        return;
      }

      if (!state.currentContest.quarterResults) {
        state.currentContest.quarterResults = [];
      }

      const quarterResult = action.payload;

      const existingIndex = state.currentContest.quarterResults.findIndex(
        (qr) => qr.quarter === quarterResult.quarter
      );

      if (existingIndex === -1) {
        state.currentContest.quarterResults.push({
          id: '',
          contestId: state.currentContest.id,
          quarter: quarterResult.quarter,
          homeTeamScore: quarterResult.homeTeamScore,
          awayTeamScore: quarterResult.awayTeamScore,
          winnerRow: quarterResult.winnerRow,
          winnerCol: quarterResult.winnerCol,
          winner: quarterResult.winner,
          winnerName: quarterResult.winnerName,
          createdAt: '',
          updatedAt: '',
          createdBy: '',
          updatedBy: '',
        });
      }

      const quarterStatusMap: Record<number, ContestStatus> = {
        1: 'Q2',
        2: 'Q3',
        3: 'Q4',
        4: 'FINISHED',
      };

      const nextStatus = quarterStatusMap[quarterResult.quarter];
      if (nextStatus) {
        state.currentContest.status = nextStatus;
      }
    },
    // add participant from websocket
    addParticipantFromWebSocket(state, action: PayloadAction<Participant>) {
      const exists = state.participants.some((p) => p.id === action.payload.id);
      if (!exists) {
        state.participants.push(action.payload);
      }
    },
    // remove participant from websocket
    removeParticipantFromWebSocket(state, action: PayloadAction<string>) {
      state.participants = state.participants.filter((p) => p.userId !== action.payload);
    },
  },
  // async thunk handlers for API operations
  extraReducers: (builder) => {
    builder
      .addCase(fetchContestsByOwner.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
      })
      .addCase(
        fetchContestsByOwner.fulfilled,
        (state, action: PayloadAction<PaginatedContestsResponse>) => {
          state.contestLoading = false;
          state.contests = action.payload.contests ?? [];
          state.pagination = {
            page: action.payload.page,
            limit: action.payload.limit,
            total: action.payload.total,
            totalPages: action.payload.totalPages,
            hasNext: action.payload.hasNext,
            hasPrevious: action.payload.hasPrevious,
          };
        }
      )
      .addCase(fetchContestsByOwner.rejected, (state, action) => {
        state.contestLoading = false;
        state.contests = [];
        state.error = action.payload?.message ?? 'Error fetching contests';
      });

    // create new contest
    builder
      .addCase(createContest.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
      })
      .addCase(createContest.fulfilled, (state, action: PayloadAction<Contest>) => {
        state.contestLoading = false;
        state.contests.push(action.payload);
      })
      .addCase(createContest.rejected, (state, action) => {
        state.contestLoading = false;
        state.error = action.payload?.message ?? 'Error creating contest';
      });

    // update square value and owner
    builder
      .addCase(updateSquare.pending, (state) => {
        state.squareLoading = true;
        state.squareErrorCode = null;
        state.error = null;
      })
      .addCase(updateSquare.fulfilled, (state, action: PayloadAction<Square>) => {
        state.squareLoading = false;
        state.squareErrorCode = null;
        const updatedSquare = action.payload;

        if (!state.currentContest) {
          return;
        }

        const index = state.currentContest.squares.findIndex(
          (s) => s.row === updatedSquare.row && s.col === updatedSquare.col
        );

        if (index !== -1) {
          state.currentContest.squares[index] = updatedSquare;
        } else {
          state.currentContest.squares.push(updatedSquare);
        }
      })
      .addCase(updateSquare.rejected, (state, action) => {
        state.squareLoading = false;
        state.squareErrorCode = action.payload?.code ?? null;
        state.error = action.payload?.message ?? 'Error updating square';
      });

    // clear square value and owner
    builder
      .addCase(clearSquare.pending, (state) => {
        state.squareLoading = true;
        state.squareErrorCode = null;
        state.error = null;
      })
      .addCase(clearSquare.fulfilled, (state, action: PayloadAction<Square>) => {
        state.squareLoading = false;
        state.squareErrorCode = null;
        const clearedSquare = action.payload;

        if (!state.currentContest) {
          return;
        }

        const index = state.currentContest.squares.findIndex(
          (s) => s.row === clearedSquare.row && s.col === clearedSquare.col
        );

        if (index !== -1) {
          state.currentContest.squares[index] = clearedSquare;
        }
      })
      .addCase(clearSquare.rejected, (state, action) => {
        state.squareLoading = false;
        state.error = action.payload?.message ?? 'Error clearing square';
      });

    // start contest
    builder
      .addCase(startContestThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(startContestThunk.fulfilled, (state, action: PayloadAction<Contest>) => {
        if (!state.currentContest) {
          return;
        }

        state.currentContest = action.payload;
      })
      .addCase(startContestThunk.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error starting contest';
      });

    // update contest details
    builder
      .addCase(updateContest.pending, (state) => {
        state.error = null;
      })
      .addCase(updateContest.fulfilled, (state, action: PayloadAction<Contest>) => {
        if (state.currentContest && state.currentContest.id === action.payload.id) {
          state.currentContest = action.payload;
        }

        const index = state.contests.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.contests[index] = action.payload;
        }
      })
      .addCase(updateContest.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error updating contest';
      });

    // delete contest by id
    builder
      .addCase(deleteContest.pending, (state) => {
        state.deleteContestLoading = true;
        state.error = null;
      })
      .addCase(deleteContest.fulfilled, (state) => {
        state.deleteContestLoading = false;
        state.contests = state.contests.filter(
          (contest) => contest.id !== state.currentContest?.id
        );
        state.currentContest = null;
      })
      .addCase(deleteContest.rejected, (state, action) => {
        state.deleteContestLoading = false;
        state.error = action.payload?.message ?? 'Error deleting contest';
      });

    // record quarter result and advance status
    builder
      .addCase(updateQuarterResult.pending, (state) => {
        state.error = null;
      })
      .addCase(updateQuarterResult.fulfilled, (state, action: PayloadAction<QuarterResult>) => {
        if (!state.currentContest) {
          return;
        }

        if (!state.currentContest.quarterResults) {
          state.currentContest.quarterResults = [];
        }

        const existingQuarterResult = state.currentContest.quarterResults.find(
          (qr) => qr.quarter === action.payload.quarter
        );

        if (existingQuarterResult) {
          return;
        }

        state.currentContest.quarterResults.push(action.payload);

        const quarterStatusMap: Record<number, ContestStatus> = {
          1: 'Q2',
          2: 'Q3',
          3: 'Q4',
          4: 'FINISHED',
        };

        const nextStatus = quarterStatusMap[action.payload.quarter];
        if (nextStatus) {
          state.currentContest.status = nextStatus;
        }
      })
      .addCase(updateQuarterResult.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error recording quarter result';
      });

    // fetch my contests (where user is a participant)
    builder
      .addCase(fetchMyContests.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
      })
      .addCase(fetchMyContests.fulfilled, (state, action: PayloadAction<Contest[]>) => {
        state.contestLoading = false;
        state.myContests = action.payload ?? [];
      })
      .addCase(fetchMyContests.rejected, (state, action) => {
        state.contestLoading = false;
        state.error = action.payload?.message ?? 'Error fetching contests';
      });

    // fetch participants
    builder
      .addCase(fetchParticipants.pending, (state) => {
        state.participantsLoading = true;
      })
      .addCase(fetchParticipants.fulfilled, (state, action: PayloadAction<Participant[]>) => {
        state.participantsLoading = false;
        state.participants = action.payload;
      })
      .addCase(fetchParticipants.rejected, (state, action) => {
        state.participantsLoading = false;
        state.error = action.payload?.message ?? 'Error fetching participants';
      });

    // update participant
    builder
      .addCase(updateContestParticipant.fulfilled, (state, action: PayloadAction<Participant>) => {
        const index = state.participants.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.participants[index] = action.payload;
        }
      })
      .addCase(updateContestParticipant.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error updating participant';
      });

    // remove participant
    builder
      .addCase(removeContestParticipant.fulfilled, (state, action: PayloadAction<string>) => {
        state.participants = state.participants.filter((p) => p.userId !== action.payload);
      })
      .addCase(removeContestParticipant.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error removing participant';
      });

    // fetch invites
    builder
      .addCase(fetchInvites.pending, (state) => {
        state.invitesLoading = true;
      })
      .addCase(fetchInvites.fulfilled, (state, action: PayloadAction<Invite[]>) => {
        state.invitesLoading = false;
        state.invites = action.payload;
      })
      .addCase(fetchInvites.rejected, (state, action) => {
        state.invitesLoading = false;
        state.error = action.payload?.message ?? 'Error fetching invites';
      });

    // create invite
    builder
      .addCase(createContestInvite.fulfilled, () => {
        // response only has inviteUrl and token; refetch invites list for full data
      })
      .addCase(createContestInvite.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error creating invite';
      });

    // delete invite
    builder
      .addCase(deleteContestInvite.fulfilled, (state, action: PayloadAction<string>) => {
        state.invites = state.invites.filter((i) => i.id !== action.payload);
      })
      .addCase(deleteContestInvite.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error deleting invite';
      });
  },
});

export const {
  clearError,
  clearSquareErrorCode,
  setCurrentContest,
  setCurrentSquare,
  setParticipants,
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
  updateQuarterResultFromWebSocket,
  addParticipantFromWebSocket,
  removeParticipantFromWebSocket,
} = contestSlice.actions;
export const contestReducer = contestSlice.reducer;
