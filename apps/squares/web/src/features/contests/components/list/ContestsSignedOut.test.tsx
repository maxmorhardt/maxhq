import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../../test/auth';
import { renderWithProviders } from '../../../../test/render';
import ContestsSignedOut from './ContestsSignedOut';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('ContestsSignedOut', () => {
  it('pitches an account beside the sign-in options', () => {
    mockAuth();
    renderWithProviders(<ContestsSignedOut />);

    expect(
      screen.getByRole('heading', { name: 'Create a board for any NFL game' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with GitHub' })).toBeInTheDocument();
  });

  it('points people who are just looking somewhere useful', () => {
    mockAuth();
    renderWithProviders(<ContestsSignedOut />);

    expect(screen.getByRole('link', { name: /how to play/i })).toHaveAttribute(
      'href',
      '/learn-more'
    );
    expect(screen.getByRole('link', { name: /this week's games/i })).toHaveAttribute(
      'href',
      '/games'
    );
  });
});
