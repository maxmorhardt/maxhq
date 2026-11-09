import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makePlayer, makeSquare } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Player } from '../../../../types/contest';
import OwnerChecklist from './OwnerChecklist';

const owner = makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 50 });

function renderGuide(players: Player[], contest: Contest = makeContest({}, 10)) {
  const onOpen = vi.fn();
  renderWithProviders(<OwnerChecklist contest={contest} players={players} onOpen={onOpen} />);
  return onOpen;
}

const currentStep = () =>
  screen.getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'step');

describe('OwnerChecklist', () => {
  it('starts with sharing the invite link', () => {
    const onOpen = renderGuide([owner]);
    expect(screen.getByRole('region', { name: 'Board setup' })).toBeInTheDocument();
    expect(currentStep()).toHaveTextContent('Invite players');
    expect(screen.getByText(/Everyone joins with no squares/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Share Invite Link' }));
    expect(onOpen).toHaveBeenCalledWith('invite');
  });

  it('names the one player waiting for squares', () => {
    const onOpen = renderGuide([owner, makePlayer({ displayName: 'Nia N.', maxSquares: 0 })]);
    expect(currentStep()).toHaveTextContent('Give out squares');
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Invite players (done)');
    expect(screen.getByText('Nia N. is waiting for squares.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Give Squares' }));
    expect(onOpen).toHaveBeenCalledWith('players');
  });

  it('counts several waiting players, and asks for room when none is left', () => {
    const waiting = [
      makePlayer({ id: 'a', userId: 'u_a', maxSquares: 0 }),
      makePlayer({ id: 'b', userId: 'u_b', maxSquares: 0 }),
    ];
    renderGuide([makePlayer({ ...owner, maxSquares: 100 }), ...waiting]);
    expect(
      screen.getByText('2 players are waiting for squares. Lower someone’s squares to make room.')
    ).toBeInTheDocument();
  });

  it('asks for the squares nobody holds yet', () => {
    renderGuide([owner, makePlayer({ maxSquares: 49 })]);
    expect(
      screen.getByText('1 square isn’t given to anyone yet, so the board can’t fill.')
    ).toBeInTheDocument();
  });

  it('counts several squares nobody holds', () => {
    renderGuide([owner, makePlayer({ maxSquares: 20 })]);
    expect(screen.getByText(/^30 squares aren’t given to anyone yet/)).toBeInTheDocument();
  });

  it('waits on the board to fill once every square is handed out', () => {
    const contest = makeContest({}, 10);
    contest.squares[0] = makeSquare({ value: 'AB' });
    renderGuide([owner, makePlayer({ maxSquares: 50 })], contest);
    expect(currentStep()).toHaveTextContent('Fill the board');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('Give out squares (done)');
    expect(
      screen.getByText(
        'Everyone has squares. 1 of 100 are claimed so far, and the numbers are drawn at kickoff.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('leaves once the board is full or the game is on', () => {
    renderGuide([owner], makeContest({ squares: [makeSquare({ value: 'AB' })] }));
    renderGuide([owner], makeContest({ status: 'Q1' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
