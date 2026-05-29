import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../features/contests/contestSlice';
import { statsReducer } from '../features/stats/statsSlice';
import { toastReducer } from '../features/toast/toastSlice';
import { wsReducer } from '../features/ws/wsSlice';

const rootReducer = {
  contest: contestReducer,
  stats: statsReducer,
  toast: toastReducer,
  ws: wsReducer,
};

export const store = configureStore({
  reducer: rootReducer,
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
