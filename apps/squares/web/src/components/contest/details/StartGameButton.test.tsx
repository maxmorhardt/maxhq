import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import StartGameButton from './StartGameButton';

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return { ...actual, startContest: vi.fn().mockResolvedValue({ id: 'c-1', status: 'Q1' }) };
});

const theme = createTheme();

const baseContest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: [0, 1],
  yLabels: [0, 1],
  status: 'ACTIVE' as const,
  visibility: 'public' as const,
  squares: [],
  owner: 'alice',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

function makeStore(currentContest = baseContest) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest },
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderButton(store = makeStore()) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <StartGameButton />
      </Provider>
    </ThemeProvider>
  );
}

describe('StartGameButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Start Quarter 1" button', () => {
    renderButton();
    expect(screen.getByRole('button', { name: /start quarter 1/i })).toBeInTheDocument();
  });

  it('renders the caption text', () => {
    renderButton();
    expect(screen.getByText(/start the game and begin quarter 1/i)).toBeInTheDocument();
  });

  it('calls startContest service when the button is clicked', async () => {
    const { startContest } = await import('../../../service/contestService');
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /start quarter 1/i }));
    await waitFor(() => expect(startContest).toHaveBeenCalledWith('c-1'));
  });
});
