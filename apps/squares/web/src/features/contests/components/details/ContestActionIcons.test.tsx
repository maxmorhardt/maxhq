import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import ContestActionIcons from './ContestActionIcons';

vi.mock('./InviteLinkDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="invite" /> : null),
}));
vi.mock('./PlayersManager', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="players" /> : null),
}));

const renderIcons = (isOwner: boolean) =>
  renderWithProviders(
    <ContestActionIcons contest={makeContest()} players={[]} viewer={makeViewer({ isOwner })} />
  );

describe('ContestActionIcons', () => {
  it('shows players and how to play to everyone', () => {
    renderIcons(false);
    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How to play' })).toHaveAttribute(
      'href',
      '/learn-more'
    );
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
  });

  it('gives the owner an invite button that opens the link', () => {
    renderIcons(true);
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(screen.getByTestId('invite')).toBeInTheDocument();
  });

  it('opens the player list', () => {
    renderIcons(false);
    fireEvent.click(screen.getByRole('button', { name: 'Players' }));
    expect(screen.getByTestId('players')).toBeInTheDocument();
  });
});
