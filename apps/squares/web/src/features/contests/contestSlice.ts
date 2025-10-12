import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Contest, Square } from '../../types/contest';
import {
  createContest,
  fetchContestById,
  fetchContestsByUser,
  updateSquare,
} from './contestThunks';

interface ContestState {
  contests: Contest[];
  currentContest?: Contest | null;
  currentSquare?: Square | null;
  contestLoading: boolean;
  squareLoading: boolean;
  error: string | null;
}

const initialState: ContestState = {
  contests: [],
  contestLoading: false,
  squareLoading: false,
  error: null,
};

const contestSlice = createSlice({
  name: 'contests',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setCurrentSquare(state, action: PayloadAction<Square>) {
      state.currentSquare = action.payload;
    },
    updateContestFromWebSocket(
      state,
      action: PayloadAction<{ xLabels?: number[]; yLabels?: number[] }>
    ) {
      if (!state.currentContest) return;

      const { xLabels, yLabels } = action.payload;

      if (xLabels !== undefined) {
        state.currentContest.xLabels = xLabels;
      }

      if (yLabels !== undefined) {
        state.currentContest.yLabels = yLabels;
      }
    },
    updateSquareFromWebSocket(state, action: PayloadAction<{ id: string; value: string }>) {
      if (!state.currentContest) return;

      const { id, value } = action.payload;
      const squareIndex = state.currentContest.squares.findIndex((square) => square.id === id);

      if (squareIndex !== -1) {
        state.currentContest.squares[squareIndex].value = value;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContestsByUser.pending, (state) => {
        state.contestLoading = true;
        state.error = null;
      })
      .addCase(fetchContestsByUser.fulfilled, (state, action: PayloadAction<Contest[]>) => {
        state.contestLoading = false;
        state.contests = action.payload;
      })
      .addCase(fetchContestsByUser.rejected, (state, action) => {
        state.contestLoading = false;
        state.error = action.payload?.message || 'Error fetching contests';
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
        state.error = action.payload?.message || 'Error fetching contest';
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
        state.error = action.payload?.message || 'Error creating contest';
      });

    builder
      .addCase(updateSquare.pending, (state) => {
        state.squareLoading = true;
        state.error = null;
      })
      .addCase(updateSquare.fulfilled, (state, action: PayloadAction<Square>) => {
        state.squareLoading = false;
        const updatedSquare = action.payload;

        if (!state.currentContest) return;

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
        state.error = action.payload?.message || 'Error updating square';
      });
  },
});

export const {
  clearError,
  setCurrentSquare,
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
} = contestSlice.actions;
export const contestReducer = contestSlice.reducer;
