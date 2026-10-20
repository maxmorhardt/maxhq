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

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/contests/:id" element={<ContestPage />} />
    </Routes>,
    { route: '/contests/c-9' }
  );

describe('ContestPage', () => {
  it('opens the live contest from the url', () => {
    mockAuth({ email: 'a@x.com' });
    renderPage();
    expect(screen.getByTestId('live')).toHaveTextContent('c-9');
  });

  it('asks a signed-out visitor to sign in', () => {
    mockAuth();
    renderPage();
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
  });
});
