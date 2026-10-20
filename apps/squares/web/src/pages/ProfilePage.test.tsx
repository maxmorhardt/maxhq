import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import ProfilePage from './ProfilePage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/profile/components/Profile', () => ({
  default: () => <div data-testid="profile" />,
}));

describe('ProfilePage', () => {
  it('shows the profile to a signed-in user', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<ProfilePage />);
    expect(screen.getByTestId('profile')).toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in', () => {
    mockAuth();
    renderWithProviders(<ProfilePage />);
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
  });
});
