import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import DeleteContest from './DeleteContest';

vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return { ...actual, deleteContestById: vi.fn().mockResolvedValue(undefined) };
});

const theme = createTheme();

const contest = {
  id: 'c-1',
  name: 'Super Bowl LX',
  xLabels: [],
  yLabels: [],
  status: 'ACTIVE' as const,
  visibility: 'public' as const,
  squares: [],
  owner: 'alice',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

function makeStore(currentContest: typeof contest | null | undefined = contest) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest } as ReturnType<
        typeof contestReducer
      >,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderDialog(open = true, currentContest: typeof contest | null = contest) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore(currentContest)}>
        <DeleteContest open={open} onClose={vi.fn()} />
      </Provider>
    </ThemeProvider>
  );
}

describe('DeleteContest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when currentContest is null', () => {
    const { container } = renderDialog(true, null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "Delete Confirmation" dialog title', () => {
    renderDialog();
    expect(screen.getByText('Delete Confirmation')).toBeInTheDocument();
  });

  it('shows the contest name in the dialog', () => {
    renderDialog();
    expect(screen.getByText(/Super Bowl LX/)).toBeInTheDocument();
  });

  it('calls deleteContestById when "Yes, Delete" is clicked', async () => {
    const { deleteContestById } = await import('../../../service/contestService');
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => expect(deleteContestById).toHaveBeenCalledWith('c-1'));
  });
});
