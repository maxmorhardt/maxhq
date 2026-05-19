import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toastReducer, addToast } from '../../features/toast/toastSlice';
import { ToastProvider } from './ToastProvider';

const theme = createTheme();

function createStore(messages: Parameters<typeof addToast>[0][] = []) {
  const store = configureStore({ reducer: { toast: toastReducer } });
  messages.forEach((m) => store.dispatch(addToast(m)));
  return store;
}

function renderProvider(store = createStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <ToastProvider />
      </ThemeProvider>
    </Provider>
  );
}

describe('ToastProvider', () => {
  it('renders nothing when there are no toast messages', () => {
    const { container } = renderProvider();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a toast for each active message', () => {
    const store = createStore([
      { message: 'First toast', severity: 'info' },
      { message: 'Second toast', severity: 'error' },
    ]);
    renderProvider(store);
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('renders a single toast with the correct message', () => {
    const store = createStore([{ message: 'Welcome!', severity: 'success' }]);
    renderProvider(store);
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('dispatches removeToast when a toast close button is clicked', () => {
    const store = createStore([{ message: 'Click to close', severity: 'warning' }]);
    renderProvider(store);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(store.getState().toast.messages).toHaveLength(0);
  });
});
