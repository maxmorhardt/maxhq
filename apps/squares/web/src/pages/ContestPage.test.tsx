import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import ContestPage from './ContestPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/contests/components/LiveContest', () => ({
  default: ({ contestId }: { contestId: string }) => <div data-testid="live">{contestId}</div>,
}));

const contestId = '6f1f4b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b';

const renderPage = (id = contestId) =>
  renderWithProviders(
    <Routes>
      <Route path="/contests/:id" element={<ContestPage />} />
    </Routes>,
    { route: `/contests/${id}` }
  );

describe('ContestPage', () => {
  it('opens the live contest from the url', () => {
    mockAuth({ email: 'a@x.com' });
    renderPage();
    expect(screen.getByTestId('live')).toHaveTextContent(contestId);
  });

  it('answers an id that cannot be a contest with not found', () => {
    mockAuth({ email: 'a@x.com' });
    renderPage('1');
    expect(screen.queryByTestId('live')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in', () => {
    mockAuth();
    renderPage();
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
  });
});
