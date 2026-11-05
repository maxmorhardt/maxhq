import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import ContestActionIcons from './ContestActionIcons';

vi.mock('./InviteLinkDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="invite" /> : null),
}));
vi.mock('./ParticipantsManager', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="participants" /> : null),
}));

const renderIcons = (isOwner: boolean) =>
  renderWithProviders(
    <ContestActionIcons
      contest={makeContest()}
      participants={[]}
      viewer={makeViewer({ isOwner })}
    />
  );

describe('ContestActionIcons', () => {
  it('shows participants and how to play to everyone', () => {
    renderIcons(false);
    expect(screen.getByRole('button', { name: 'Participants' })).toBeInTheDocument();
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

  it('opens the participant list', () => {
    renderIcons(false);
    fireEvent.click(screen.getByRole('button', { name: 'Participants' }));
    expect(screen.getByTestId('participants')).toBeInTheDocument();
  });
});
