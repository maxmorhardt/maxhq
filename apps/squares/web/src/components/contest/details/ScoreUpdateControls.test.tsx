import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import ScoreUpdateControls from './ScoreUpdateControls';

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return { ...actual, recordQuarterResult: vi.fn().mockResolvedValue({}) };
});

const theme = createTheme();

const baseContest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: [0, 1, 2],
  yLabels: [0, 1, 2],
  status: 'Q1' as const,
  visibility: 'public' as const,
  squares: [],
  owner: 'alice',
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
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

function renderControls(store = makeStore()) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <ScoreUpdateControls />
      </Provider>
    </ThemeProvider>
  );
}

describe('ScoreUpdateControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Update Score" section with team labels', () => {
    renderControls();
    expect(screen.getByRole('heading', { name: /update score/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/chiefs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/eagles/i)).toBeInTheDocument();
  });

  it('renders nothing when there is no current contest', () => {
    const store = configureStore({
      reducer: { contest: contestReducer },
      preloadedState: {
        contest: { ...contestReducer(undefined, { type: '' }), currentContest: null },
      },
    });
    const { container } = renderControls(store);
    expect(container).toBeEmptyDOMElement();
  });

  it('submits score when Update Score is clicked with valid inputs', async () => {
    const { recordQuarterResult } = await import('../../../service/contestService');
    renderControls();
    fireEvent.change(screen.getByLabelText(/chiefs/i), { target: { value: '14' } });
    fireEvent.change(screen.getByLabelText(/eagles/i), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /update score/i }));
    await waitFor(() => expect(recordQuarterResult).toHaveBeenCalled());
  });

  it('does not submit when score inputs contain non-numeric text', async () => {
    const { recordQuarterResult } = await import('../../../service/contestService');
    renderControls();
    // input values that parseInt will produce NaN for
    fireEvent.change(screen.getByLabelText(/chiefs/i), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText(/eagles/i), { target: { value: 'xyz' } });
    fireEvent.click(screen.getByRole('button', { name: /update score/i }));
    await new Promise((r) => setTimeout(r, 50));
    expect(recordQuarterResult).not.toHaveBeenCalled();
  });

  it('prevents e, E, +, - key presses in home score input', () => {
    renderControls();
    const homeInput = screen.getByLabelText(/chiefs/i);
    for (const key of ['e', 'E', '+', '-']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      homeInput.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it('prevents e, E, +, - key presses in away score input', () => {
    renderControls();
    const awayInput = screen.getByLabelText(/eagles/i);
    for (const key of ['e', 'E', '+', '-']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      awayInput.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it('ignores values longer than 4 characters in score inputs', () => {
    renderControls();
    const homeInput = screen.getByLabelText(/chiefs/i);
    // valid short value first
    fireEvent.change(homeInput, { target: { value: '12' } });
    expect(homeInput).toHaveValue(12);
    // now try too long
    fireEvent.change(homeInput, { target: { value: '12345' } });
    // should remain at 12 since 5 digits > MAX_SCORE_LENGTH(4)
    expect(homeInput).toHaveValue(12);
  });
});
