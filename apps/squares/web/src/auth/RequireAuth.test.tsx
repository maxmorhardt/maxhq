import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import RequireAuth from './RequireAuth';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

const renderGate = (props: Partial<Parameters<typeof RequireAuth>[0]> = {}) =>
  renderWithProviders(
    <RequireAuth fallback={<p>restoring</p>} {...props}>
      <p>secret</p>
    </RequireAuth>
  );

describe('RequireAuth', () => {
  it('shows the page to a signed-in user', () => {
    mockAuth({ email: 'a@x.com' });
    renderGate();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('shows the fallback while the session restores', () => {
    mockAuth({ isLoading: true });
    renderGate();
    expect(screen.getByText('restoring')).toBeInTheDocument();
  });

  it('says it is redirecting during a sign-in redirect', () => {
    mockAuth({ isLoading: true, activeNavigator: 'signinRedirect' });
    renderGate();
    expect(screen.getByText('Redirecting to sign in...')).toBeInTheDocument();
  });

  it('asks a signed-out user to sign in', () => {
    mockAuth();
    renderGate();
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('can show a custom signed-out view', () => {
    mockAuth();
    renderGate({ unauthenticated: <p>join us</p> });
    expect(screen.getByText('join us')).toBeInTheDocument();
  });
});
