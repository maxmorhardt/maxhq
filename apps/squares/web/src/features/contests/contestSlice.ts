import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Contest, PaginatedContestsResponse, Square } from '../../types/contest';
import {
  clearSquare,
  createContest,
  deleteContest,
  fetchContestById,
  fetchContests,
  fetchContestsByUser,
  randomizeLabels,
  updateContest,
  updateSquare,
} from './contestThunks';

interface ContestState {
  contests: Contest[];
  currentContest?: Contest | null;
  currentSquare?: Square | null;
  contestLoading: boolean;
  deleteContestLoading: boolean;
  squareLoading: boolean;
  error: string | null;
  pagination: {
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
  contestLoading: false,
  deleteContestLoading: false,
  squareLoading: false,
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
    clearError(state) {
      state.error = null;
    },
    setCurrentContest(state, action: PayloadAction<Contest | null>) {
      state.currentContest = action.payload;
    },
    setCurrentSquare(state, action: PayloadAction<Square>) {
      state.currentSquare = action.payload;
    },
    updateContestFromWebSocket(
      state,
      action: PayloadAction<{ xLabels?: number[]; yLabels?: number[] }>
    ) {
      const { xLabels, yLabels } = action.payload;
      if (!state.currentContest || xLabels === undefined || yLabels === undefined) {
        return;
      }

      state.currentContest.xLabels = xLabels;
      state.currentContest.yLabels = yLabels;
    },
    updateSquareFromWebSocket(state, action: PayloadAction<{ id: string; value: string }>) {
      if (!state.currentContest) {
        return;
      }

      const { id, value } = action.payload;
      const squareIndex = state.currentContest.squares.findIndex((square) => square.id === id);

      if (squareIndex !== -1) {
        state.currentContest.squares[squareIndex].value = value;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContests.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
      })
      .addCase(
        fetchContests.fulfilled,
        (state, action: PayloadAction<PaginatedContestsResponse>) => {
          state.contestLoading = false;
          state.contests = action.payload.contests;
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
      .addCase(fetchContests.rejected, (state, action) => {
        state.contestLoading = false;
        state.error = action.payload?.message ?? 'Error fetching contests';
      });

    builder
      .addCase(fetchContestsByUser.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
      })
      .addCase(
        fetchContestsByUser.fulfilled,
        (state, action: PayloadAction<PaginatedContestsResponse>) => {
          state.contestLoading = false;
          state.contests = action.payload.contests;
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
      .addCase(fetchContestsByUser.rejected, (state, action) => {
        state.contestLoading = false;
        state.contests = [];
        state.error = action.payload?.message ?? 'Error fetching contests';
      });

    builder
      .addCase(fetchContestById.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
        state.currentContest = null;
      })
      .addCase(fetchContestById.fulfilled, (state, action: PayloadAction<Contest>) => {
        state.contestLoading = false;
        state.currentContest = action.payload;
      })
      .addCase(fetchContestById.rejected, (state, action) => {
        state.contestLoading = false;
        state.error = action.payload?.message ?? 'Error fetching contest';
      });

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

    builder
      .addCase(updateSquare.pending, (state) => {
        state.squareLoading = true;
        state.error = null;
      })
      .addCase(updateSquare.fulfilled, (state, action: PayloadAction<Square>) => {
        state.squareLoading = false;
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
        state.error = action.payload?.message ?? 'Error updating square';
      });

    builder
      .addCase(clearSquare.pending, (state) => {
        state.squareLoading = true;
        state.error = null;
      })
      .addCase(clearSquare.fulfilled, (state, action: PayloadAction<Square>) => {
        state.squareLoading = false;
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

    builder
      .addCase(randomizeLabels.pending, (state) => {
        state.error = null;
      })
      .addCase(randomizeLabels.fulfilled, (state, action: PayloadAction<Contest>) => {
        if (!state.currentContest) {
          return;
        }

        state.currentContest.xLabels = action.payload.xLabels;
        state.currentContest.yLabels = action.payload.yLabels;
      })
      .addCase(randomizeLabels.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error randomizing labels';
      });

    builder
      .addCase(updateContest.pending, (state) => {
        state.error = null;
      })
      .addCase(updateContest.fulfilled, (state, action: PayloadAction<Contest>) => {
        if (state.currentContest && state.currentContest.id === action.payload.id) {
          state.currentContest = action.payload;
        }

        // Also update in the contests array if it exists
        const index = state.contests.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.contests[index] = action.payload;
        }
      })
      .addCase(updateContest.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Error updating contest';
      });

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
  },
});

export const {
  clearError,
  setCurrentContest,
  setCurrentSquare,
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
} = contestSlice.actions;
export const contestReducer = contestSlice.reducer;
