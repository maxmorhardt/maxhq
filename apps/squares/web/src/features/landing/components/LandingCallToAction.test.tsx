import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import LandingCallToAction from './LandingCallToAction';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: false, signinRedirect: vi.fn() }),
}));

describe('LandingCallToAction', () => {
  it('renders the closing heading and the create button', () => {
    renderWithProviders(<LandingCallToAction />);

    expect(screen.getByRole('heading', { name: /kickoff is coming/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
  });
});
