import { describe, it, expect } from 'vitest';
import { store } from './store';

describe('store', () => {
  it('should have contest reducer', () => {
    expect(store.getState()).toHaveProperty('contest');
  });

  it('should have stats reducer', () => {
    expect(store.getState()).toHaveProperty('stats');
  });

  it('should have toast reducer', () => {
    expect(store.getState()).toHaveProperty('toast');
  });

  it('should have ws reducer', () => {
    expect(store.getState()).toHaveProperty('ws');
  });

  it('should initialize with default state', () => {
    const state = store.getState();
    expect(state.toast.messages).toEqual([]);
    expect(state.stats.stats).toBeNull();
    expect(state.ws.connectionId).toBeNull();
  });
});
