import type { RootState } from '../../app/store';
import type { Grid, GridCell } from '../../types/grid';

export const selectGrids = (state: RootState): Grid[] => state.grid.grids;
export const selectCurrentGrid = (state: RootState): Grid | null | undefined => state.grid.currentGrid;
export const selectCurrentCell = (state: RootState): GridCell | null | undefined => state.grid.currentCell;
export const selectGridLoading = (state: RootState): boolean => state.grid.gridLoading;
export const selectCellLoading = (state: RootState): boolean => state.grid.gridLoading;
export const selectGridError = (state: RootState): string | null => state.grid.error;