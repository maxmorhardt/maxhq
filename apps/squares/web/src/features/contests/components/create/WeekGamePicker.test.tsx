import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import type { Game, Scoreboard } from '../../../../types/contest';
import WeekGamePicker from './WeekGamePicker';

const at = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const game = (id: string, gameTime: string, status: Game['status'] = 'scheduled') =>
  ({
    id,
    homeTeam: `Home ${id}`,
    awayTeam: `Away ${id}`,
    homeAbbr: 'HOM',
    awayAbbr: 'AWY',
    gameTime,
    status,
    period: status === 'final' ? 4 : 0,
  }) as Game;

const board: Scoreboard = {
  season: 2026,
  seasonType: 2,
  week: 10,
  label: 'Week 10',
  next: { season: 2026, seasonType: 2, week: 11 },
  games: [game('done', at(-3), 'final'), game('soon', at(30)), game('later', at(54))],
};

const props = {
  board,
  loading: false,
  refreshing: false,
  failed: false,
  invalid: false,
  onRetry: vi.fn(),
  onSelect: vi.fn(),
  onWeek: vi.fn(),
};

describe('WeekGamePicker', () => {
  it('names the week and counts the games still open', () => {
    renderWithProviders(<WeekGamePicker {...props} />);

    expect(screen.getByRole('heading', { name: 'Week 10' })).toBeInTheDocument();
    expect(screen.getByText(/2 open/)).toBeInTheDocument();
  });

  it('greys out a game that cannot be picked and says why', () => {
    const onSelect = vi.fn();
    renderWithProviders(<WeekGamePicker {...props} onSelect={onSelect} />);

    const done = screen.getByRole('radio', { name: 'Away done @ Home done, Final' });
    expect(done).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(done);
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'Away soon @ Home soon' }));
    expect(onSelect).toHaveBeenCalledWith(board.games[1]);
  });

  it('marks the picked game', () => {
    renderWithProviders(<WeekGamePicker {...props} selectedId="later" />);

    expect(screen.getByRole('radio', { name: 'Away later @ Home later' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('steps to the next week and stops where the calendar ends', () => {
    const onWeek = vi.fn();
    renderWithProviders(<WeekGamePicker {...props} onWeek={onWeek} />);

    expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onWeek).toHaveBeenCalledWith(board.next);
  });

  it('holds still while the next week loads', () => {
    renderWithProviders(<WeekGamePicker {...props} refreshing />);

    expect(screen.getByRole('radiogroup', { name: 'Game' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('shows a placeholder while loading', () => {
    renderWithProviders(<WeekGamePicker {...props} board={undefined} loading />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('offers a retry when the week fails, and a way back once the player has moved', () => {
    const onRetry = vi.fn();
    const onReset = vi.fn();
    const { rerender } = renderWithProviders(
      <WeekGamePicker {...props} failed onRetry={onRetry} />
    );
    expect(screen.queryByRole('button', { name: 'Back to this week' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();

    rerender(<WeekGamePicker {...props} failed onRetry={onRetry} onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to this week' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('keeps a picked game picked after it kicks off', () => {
    renderWithProviders(<WeekGamePicker {...props} selectedId="done" />);

    const done = screen.getByRole('radio', { name: 'Away done @ Home done' });
    expect(done).toHaveAttribute('aria-checked', 'true');
    expect(done).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Final')).not.toBeInTheDocument();
  });

  it('says when every game in the week has kicked off', () => {
    const spent = { ...board, games: [board.games[0]] };
    const { rerender } = renderWithProviders(<WeekGamePicker {...props} board={spent} />);
    expect(screen.getByText(/Pick one from a later week/)).toBeInTheDocument();

    rerender(<WeekGamePicker {...props} board={{ ...spent, next: undefined }} />);
    expect(screen.getByText(/No games are open right now/)).toBeInTheDocument();
  });

  it('explains a week with no games yet', () => {
    renderWithProviders(<WeekGamePicker {...props} board={{ ...board, games: [] }} />);

    expect(screen.getByText(/No games scheduled this week yet/)).toBeInTheDocument();
  });
});
