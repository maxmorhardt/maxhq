import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WinnerCelebrationDialog from './WinnerCelebrationDialog';

const result = {
  id: 'qr-2',
  contestId: 'c-1',
  quarter: 2,
  homeTeamScore: 21,
  awayTeamScore: 14,
  winnerRow: 3,
  winnerCol: 5,
  winner: 'me@x.com',
  winnerName: 'Me',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

describe('WinnerCelebrationDialog', () => {
  it('renders nothing when there is no result', () => {
    render(<WinnerCelebrationDialog result={null} onClose={vi.fn()} />);
    expect(screen.queryByText('You Won!')).not.toBeInTheDocument();
  });

  it('renders the winning square and score', () => {
    render(<WinnerCelebrationDialog result={result} onClose={vi.fn()} />);
    expect(screen.getByText('You Won!')).toBeInTheDocument();
    expect(screen.getByText('Your square (5, 3) took Quarter 2')).toBeInTheDocument();
    expect(screen.getByText(/21/)).toBeInTheDocument();
  });

  it('calls onClose when the "Let\'s Go!" button is clicked', () => {
    const onClose = vi.fn();
    render(<WinnerCelebrationDialog result={result} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /let's go/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the close icon button is clicked', () => {
    const onClose = vi.fn();
    render(<WinnerCelebrationDialog result={result} onClose={onClose} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
