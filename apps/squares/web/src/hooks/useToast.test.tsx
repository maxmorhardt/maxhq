import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toastReducer } from '../features/toast/toastSlice';
import { useToast } from './useToast';
import type { ReactNode } from 'react';

function createTestStore() {
  return configureStore({
    reducer: { toast: toastReducer },
  });
}

function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useToast', () => {
  it('should add a toast with default severity', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useToast(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.showToast('Hello');
    });

    const messages = store.getState().toast.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe('Hello');
    expect(messages[0].severity).toBe('info');
  });

  it('should add a toast with specified severity', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useToast(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.showToast('Error!', 'error');
    });

    const messages = store.getState().toast.messages;
    expect(messages[0].severity).toBe('error');
  });

  it('should add a toast with custom duration', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useToast(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.showToast('Quick', 'info', 1000);
    });

    const messages = store.getState().toast.messages;
    expect(messages[0].duration).toBe(1000);
  });

  it('should remove a toast by id', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useToast(), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current.showToast('Remove me');
    });

    const id = store.getState().toast.messages[0].id;

    act(() => {
      result.current.hideToast(id);
    });

    expect(store.getState().toast.messages).toHaveLength(0);
  });
});
