import { configureStore } from "@reduxjs/toolkit";
import { gridReducer } from '../features/grids/gridSlice';

export const store = configureStore({
  reducer: {
    grid: gridReducer
  },
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
