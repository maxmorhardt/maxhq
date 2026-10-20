import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import JoinPage from './JoinPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/join/components/JoinInvite', () => ({
  default: ({ token }: { token: string }) => <div data-testid="join">{token}</div>,
}));
vi.mock('../features/join/components/InviteSignIn', () => ({
  default: () => <div data-testid="sign-in" />,
}));

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/join/:token" element={<JoinPage />} />
    </Routes>,
    { route: '/join/abc' }
  );

describe('JoinPage', () => {
  it('redeems the invite for a signed-in user', () => {
    mockAuth({ email: 'a@x.com' });
    renderPage();
    expect(screen.getByTestId('join')).toHaveTextContent('abc');
  });

  it('invites a signed-out visitor to sign in', () => {
    mockAuth();
    renderPage();
    expect(screen.getByTestId('sign-in')).toBeInTheDocument();
  });

  it('waits while the session restores', () => {
    mockAuth({ isLoading: true });
    renderPage();
    expect(screen.getByText('Loading invite...')).toBeInTheDocument();
  });
});
