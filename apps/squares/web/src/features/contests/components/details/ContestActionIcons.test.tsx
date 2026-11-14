import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makePlayer, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Player } from '../../../../types/contest';
import ContestActionIcons from './ContestActionIcons';

const owner = makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 50 });
const waiting = makePlayer({ id: 'w', userId: 'u_w', maxSquares: 0 });

function renderIcons(isOwner: boolean, players: Player[] = [], squaresToGive = false) {
  const onOpen = vi.fn();
  renderWithProviders(
    <ContestActionIcons
      players={players}
      viewer={makeViewer({ isOwner })}
      onOpen={onOpen}
      squaresToGive={squaresToGive}
    />
  );
  return onOpen;
}

describe('ContestActionIcons', () => {
  it('shows players and how to play to everyone', () => {
    renderIcons(false, [owner]);
    expect(screen.getByRole('button', { name: 'Players (1)' })).toHaveTextContent('Players1');
    expect(screen.getByRole('link', { name: 'How to play' })).toHaveAttribute(
      'href',
      '/learn-more'
    );
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
  });

  it('gives the owner an invite button', () => {
    const onOpen = renderIcons(true);
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    expect(onOpen).toHaveBeenCalledWith('invite');
  });

  it('opens the player list', () => {
    const onOpen = renderIcons(false);
    fireEvent.click(screen.getByRole('button', { name: 'Players (0)' }));
    expect(onOpen).toHaveBeenCalledWith('players');
  });

  it('flags squares left to give out', () => {
    renderIcons(true, [owner, waiting], true);
    expect(
      screen.getByRole('button', { name: 'Players (2), some waiting for squares' })
    ).toBeInTheDocument();
  });
});
