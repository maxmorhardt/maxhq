import { describe, it, expect } from 'vitest';
import { toastReducer, addToast, removeToast, clearAllToasts } from './toastSlice';

const initialState = {
  messages: [] as {
    id: string;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
    duration?: number;
  }[],
};

describe('toastSlice', () => {
  it('should return initial state', () => {
    const state = toastReducer(undefined, { type: 'unknown' });
    expect(state.messages).toEqual([]);
  });

  it('addToast should add a toast with generated id and default duration', () => {
    const state = toastReducer(initialState, addToast({ message: 'Hello', severity: 'info' }));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].message).toBe('Hello');
    expect(state.messages[0].severity).toBe('info');
    expect(state.messages[0].duration).toBe(3000);
    expect(state.messages[0].id).toBeTruthy();
  });

  it('addToast should respect custom duration', () => {
    const state = toastReducer(
      initialState,
      addToast({ message: 'Quick', severity: 'success', duration: 1000 })
    );
    expect(state.messages[0].duration).toBe(1000);
  });

  it('removeToast should remove toast by id', () => {
    let state = toastReducer(initialState, addToast({ message: 'A', severity: 'info' }));
    const id = state.messages[0].id;
    state = toastReducer(state, removeToast(id));
    expect(state.messages).toHaveLength(0);
  });

  it('removeToast should not remove other toasts', () => {
    let state = toastReducer(initialState, addToast({ message: 'A', severity: 'info' }));
    state = toastReducer(state, addToast({ message: 'B', severity: 'error' }));
    const idToRemove = state.messages[0].id;
    state = toastReducer(state, removeToast(idToRemove));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].message).toBe('B');
  });

  it('clearAllToasts should remove all toasts', () => {
    let state = toastReducer(initialState, addToast({ message: 'A', severity: 'info' }));
    state = toastReducer(state, addToast({ message: 'B', severity: 'error' }));
    state = toastReducer(state, clearAllToasts());
    expect(state.messages).toHaveLength(0);
  });
});
