import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { ContestViewer } from '../../live/viewer';
import ContestDialogs, { type ContestDialog } from './ContestDialogs';

vi.mock('./InviteLinkDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="invite" /> : null),
}));
vi.mock('./PlayersManager', () => ({
  default: ({ open, onInvite }: { open: boolean; onInvite: () => void }) =>
    open ? <button onClick={onInvite}>players</button> : null,
}));

function renderDialogs(open: ContestDialog | null, viewer: ContestViewer) {
  const onOpen = vi.fn();
  renderWithProviders(
    <ContestDialogs
      open={open}
      onOpen={onOpen}
      onClose={vi.fn()}
      contest={makeContest()}
      players={[]}
      viewer={viewer}
    />
  );
  return onOpen;
}

describe('ContestDialogs', () => {
  it('opens the invite link for the owner', () => {
    renderDialogs('invite', makeViewer({ isOwner: true }));
    expect(screen.getByTestId('invite')).toBeInTheDocument();
  });

  it('never renders the invite link for anyone else', () => {
    renderDialogs('invite', makeViewer());
    expect(screen.queryByTestId('invite')).not.toBeInTheDocument();
  });

  it('switches from the player list to the invite link', () => {
    const onOpen = renderDialogs('players', makeViewer({ isOwner: true }));
    fireEvent.click(screen.getByRole('button', { name: 'players' }));
    expect(onOpen).toHaveBeenCalledWith('invite');
  });
});
