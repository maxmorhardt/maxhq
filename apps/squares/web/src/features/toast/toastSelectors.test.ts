import { describe, it, expect } from 'vitest';
import { selectToastMessages } from './toastSelectors';
import type { ToastMessage } from './toastSlice';

const makeState = (messages: ToastMessage[]) => ({ toast: { messages } });

describe('toastSelectors', () => {
  it('selectToastMessages returns an empty array when there are no messages', () => {
    const result = selectToastMessages(makeState([]));
    expect(result).toEqual([]);
  });

  it('selectToastMessages returns all messages from state', () => {
    const messages: ToastMessage[] = [
      { id: '1', message: 'Hello', severity: 'info', duration: 3000 },
      { id: '2', message: 'Error!', severity: 'error', duration: 5000 },
    ];
    const result = selectToastMessages(makeState(messages));
    expect(result).toEqual(messages);
  });

  it('selectToastMessages returns the same reference from state', () => {
    const messages: ToastMessage[] = [{ id: '1', message: 'Hi', severity: 'success' }];
    const state = makeState(messages);
    expect(selectToastMessages(state)).toBe(state.toast.messages);
  });
});
