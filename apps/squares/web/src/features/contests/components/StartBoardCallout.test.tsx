import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../test/auth';
import { renderWithProviders } from '../../../test/render';
import StartBoardCallout from './StartBoardCallout';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('StartBoardCallout', () => {
  it("offers a signed-out visitor a free board in the page's own words", () => {
    mockAuth();
    renderWithProviders(
      <StartBoardCallout message="Ready to play?" signedInMessage="Next game?" />
    );

    expect(screen.getByRole('complementary', { name: 'Start a board' })).toBeInTheDocument();
    expect(screen.getByText('Ready to play?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start a free board/i })).toBeInTheDocument();
  });

  it('speaks to a signed-in participant in their own words', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(
      <StartBoardCallout message="Ready to play?" signedInMessage="Next game?" />
    );

    expect(screen.queryByText('Ready to play?')).not.toBeInTheDocument();
    expect(screen.getByText('Next game?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^start a board$/i })).toBeInTheDocument();
  });
});
