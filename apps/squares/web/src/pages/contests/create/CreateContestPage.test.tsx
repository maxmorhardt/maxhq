import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import { toastReducer } from '../../../features/toast/toastSlice';
import CreateContestPage from './CreateContestPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../service/contestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../service/contestService')>();
  return { ...actual, createNewContest: vi.fn() };
});

import { useAuth } from 'react-oidc-context';
import { createNewContest } from '../../../service/contestService';

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({ reducer: { contest: contestReducer, toast: toastReducer } });
}

function renderPage() {
  return render(
    <Provider store={createTestStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <CreateContestPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe('CreateContestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { preferred_username: 'user1', name: 'User One' } },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders the Create New Contest heading', () => {
    renderPage();
    expect(screen.getByText('Create New Contest')).toBeInTheDocument();
  });

  it('renders the Back to Contests button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /back to contests/i })).toBeInTheDocument();
  });

  it('navigates back when Back to Contests is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /back to contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });

  it('renders the contest name field', () => {
    renderPage();
    expect(screen.getByLabelText(/contest name/i)).toBeInTheDocument();
  });

  it('renders the Home Team and Away Team fields', () => {
    renderPage();
    expect(screen.getByLabelText(/home team/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/away team/i)).toBeInTheDocument();
  });

  it('renders Private and Public toggle buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /private/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /public/i })).toBeInTheDocument();
  });

  it('renders the Create Contest submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create contest/i })).toBeInTheDocument();
  });

  it('shows a warning when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(screen.getByText(/you must be logged in to create a contest/i)).toBeInTheDocument();
  });

  it('shows an error alert when submitting without a contest name', async () => {
    renderPage();
    fireEvent.submit(document.querySelector('form')!);
    expect(await screen.findByText('Contest name is required')).toBeInTheDocument();
  });

  it('shows error when user has no preferred_username', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { preferred_username: undefined } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    fireEvent.change(screen.getByLabelText(/contest name/i), {
      target: { name: 'name', value: 'Test Contest' },
    });
    fireEvent.submit(document.querySelector('form')!);
    expect(await screen.findByText('User is missing a username')).toBeInTheDocument();
  });

  it('navigates to contest page on successful creation', async () => {
    vi.mocked(createNewContest).mockResolvedValue({
      owner: 'user1',
      name: 'Super Bowl 2025',
    } as Awaited<ReturnType<typeof createNewContest>>);

    renderPage();
    fireEvent.change(screen.getByLabelText(/contest name/i), {
      target: { name: 'name', value: 'Super Bowl 2025' },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/contests/owner/user1/name/Super Bowl 2025')
    );
  });

  it('shows error message when createContest thunk rejects', async () => {
    vi.mocked(createNewContest).mockRejectedValue({ message: 'Name already taken' });

    renderPage();
    fireEvent.change(screen.getByLabelText(/contest name/i), {
      target: { name: 'name', value: 'Taken Name' },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(screen.getByText('Name already taken')).toBeInTheDocument());
  });

  it('toggles visibility to Public when Public button is clicked', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /public/i }));
    await waitFor(() => expect(screen.getByText(/anyone can view/i)).toBeInTheDocument());
  });

  it('changes max squares when slider value changes', () => {
    const { container } = renderPage();
    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider!, { target: { value: '25' } });
    expect(screen.getByText('Create New Contest')).toBeInTheDocument();
  });

  it('shows error when submitting with a name but user is null', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    fireEvent.change(screen.getByLabelText(/contest name/i), {
      target: { name: 'name', value: 'Test Contest' },
    });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() =>
      expect(screen.getByText('You must be logged in to create a contest')).toBeInTheDocument()
    );
  });
});
