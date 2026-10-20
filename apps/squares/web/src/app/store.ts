import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '../api/baseApi';
import { liveContestReducer } from '../features/contests/live/liveContestSlice';
import { toastReducer } from '../features/toast/toastSlice';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  liveContest: liveContestReducer,
  toast: toastReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    devTools: { maxAge: 50 },
  });
}

export const store = makeStore();

// refetches cached queries when the browser comes back online
setupListeners(store.dispatch);

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
