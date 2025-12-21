import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../features/contests/contestSlice';
import { toastReducer } from '../features/toast/toastSlice';
import { wsReducer } from '../features/ws/wsSlice';

// combine all reducers into root reducer
const rootReducer = {
  contest: contestReducer,
  toast: toastReducer,
  ws: wsReducer,
};

// create redux store with combined reducers
export const store = configureStore({
  reducer: rootReducer,
});

// export types for typescript support
export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
