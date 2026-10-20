import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import CreateContestPage from './CreateContestPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/contests/components/create/CreateContestForm', () => ({
  default: () => <div data-testid="form" />,
}));

describe('CreateContestPage', () => {
  it('shows the form with a way back', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<CreateContestPage />);
    expect(screen.getByRole('heading', { name: 'Create New Contest' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Contests' })).toHaveAttribute(
      'href',
      '/contests'
    );
    expect(screen.getByTestId('form')).toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in', () => {
    mockAuth();
    renderWithProviders(<CreateContestPage />);
    expect(screen.queryByTestId('form')).not.toBeInTheDocument();
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
  });
});
