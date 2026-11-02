import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../test/auth';
import { renderWithProviders } from '../../../test/render';
import StartBoardCallout from './StartBoardCallout';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('StartBoardCallout', () => {
  it('gives a signed-out visitor a way to start and learn', () => {
    mockAuth();
    renderWithProviders(<StartBoardCallout />);

    expect(screen.getByRole('heading', { name: 'New to Squares?' })).toBeInTheDocument();
    expect(screen.getByText(/no money involved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How to Play' })).toHaveAttribute(
      'href',
      '/learn-more'
    );
  });

  it('drops the how to play link on the how to play page', () => {
    mockAuth();
    renderWithProviders(<StartBoardCallout showHowToPlay={false} />);

    expect(screen.queryByRole('link', { name: 'How to Play' })).not.toBeInTheDocument();
  });

  it('stays out of the way of a signed-in player', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<StartBoardCallout />);

    expect(screen.queryByRole('heading', { name: 'New to Squares?' })).not.toBeInTheDocument();
  });
});
