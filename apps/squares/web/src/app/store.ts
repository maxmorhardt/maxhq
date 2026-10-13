import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../features/contests/contestSlice';
import { leaderboardReducer } from '../features/leaderboard/leaderboardSlice';
import { statsReducer } from '../features/stats/statsSlice';
import { toastReducer } from '../features/toast/toastSlice';
import { userReducer } from '../features/user/userSlice';
import { wsReducer } from '../features/ws/wsSlice';

const rootReducer = {
  contest: contestReducer,
  leaderboard: leaderboardReducer,
  stats: statsReducer,
  toast: toastReducer,
  user: userReducer,
  ws: wsReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  devTools: { maxAge: 50 },
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
