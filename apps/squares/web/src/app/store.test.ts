import { describe, expect, it } from 'vitest';
import { makeStore, store } from './store';

describe('store', () => {
  it('holds the api cache, the live contest, and toasts', () => {
    expect(Object.keys(store.getState()).sort()).toEqual(['api', 'liveContest', 'toast']);
  });

  it('starts from preloaded state', () => {
    const preloaded = makeStore({
      toast: { messages: [{ id: 't', message: 'hi', severity: 'info' }] },
    });
    expect(preloaded.getState().toast.messages).toHaveLength(1);
  });
});
