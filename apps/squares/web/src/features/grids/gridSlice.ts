import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { Grid, GridCell } from "../../types/grid";
import {
  createGrid,
  fetchGridById,
  fetchGridsByUser,
  setCurrentCell,
  updateCell,
} from "./gridThunks";

interface GridState {
  grids: Grid[];
  currentGrid?: Grid | null;
  currentCell?: GridCell | null;
  gridLoading: boolean;
  cellLoading: boolean;
  error: string | null;
}

const initialState: GridState = {
  grids: [],
  gridLoading: false,
  cellLoading: false,
  error: null,
};

const gridSlice = createSlice({
  name: "grids",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGridsByUser.pending, (state) => {
        state.gridLoading = true;
        state.error = null;
      })
      .addCase(fetchGridsByUser.fulfilled, (state, action: PayloadAction<Grid[]>) => {
        state.gridLoading = false;
        state.grids = action.payload;
      })
      .addCase(fetchGridsByUser.rejected, (state, action) => {
        state.gridLoading = false;
        state.error = action.payload?.message || "Error fetching grids";
      });

    builder
      .addCase(fetchGridById.pending, (state) => {
        state.gridLoading = true;
        state.error = null;
        state.currentGrid = null;
      })
      .addCase(fetchGridById.fulfilled, (state, action: PayloadAction<Grid>) => {
        state.gridLoading = false;
        state.currentGrid = action.payload;
      })
      .addCase(fetchGridById.rejected, (state, action) => {
        state.gridLoading = false;
        state.error = action.payload?.message || "Error fetching grid";
      });

    builder
      .addCase(createGrid.pending, (state) => {
        state.gridLoading = true;
        state.error = null;
      })
      .addCase(createGrid.fulfilled, (state, action: PayloadAction<Grid>) => {
        state.gridLoading = false;
        state.grids.push(action.payload);
      })
      .addCase(createGrid.rejected, (state, action) => {
        state.gridLoading = false;
        state.error = action.payload?.message || "Error creating grid";
      });

    builder.addCase(setCurrentCell.fulfilled, (state, action) => {
      state.currentCell = action.payload;
    });

    builder
      .addCase(updateCell.pending, (state) => {
        state.cellLoading = true;
        state.error = null;
      })
      .addCase(updateCell.fulfilled, (state, action: PayloadAction<GridCell>) => {
        state.cellLoading = false;
        const updatedCell = action.payload;

        if (!state.currentGrid) return;

        const index = state.currentGrid.cells.findIndex(
          (c) => c.row === updatedCell.row && c.col === updatedCell.col
        );

        if (index !== -1) {
          state.currentGrid.cells[index] = updatedCell;
        } else {
          state.currentGrid.cells.push(updatedCell);
        }
      })
      .addCase(updateCell.rejected, (state, action) => {
        state.cellLoading = false;
        state.error = action.payload?.message || "Error creating grid";
      });
  },
});

export const gridReducer = gridSlice.reducer;
