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
    expect(screen.queryByText('Your Square Hit')).not.toBeInTheDocument();
  });

  it('renders the winning square and score', () => {
    render(<WinnerCelebrationDialog result={result} onClose={vi.fn()} />);
    expect(screen.getByText('Q2 Final')).toBeInTheDocument();
    expect(screen.getByText('Last digits 4 and 1 landed on your square.')).toBeInTheDocument();
    expect(screen.getByText('Away').previousSibling).toHaveTextContent('14');
    expect(screen.getByText('Home').previousSibling).toHaveTextContent('21');
  });

  it('labels the column with the home digit and the row with the away digit', () => {
    render(<WinnerCelebrationDialog result={result} onClose={vi.fn()} />);
    expect(screen.getByTestId('column-digit')).toHaveTextContent('1');
    expect(screen.getByTestId('row-digit')).toHaveTextContent('4');
  });

  it('keeps the last result on screen while closing', () => {
    const { rerender } = render(<WinnerCelebrationDialog result={result} onClose={vi.fn()} />);
    rerender(<WinnerCelebrationDialog result={null} onClose={vi.fn()} />);
    expect(screen.getByText('Q2 Final')).toBeInTheDocument();
  });

  it('calls onClose when the "Back to the Board" button is clicked', () => {
    const onClose = vi.fn();
    render(<WinnerCelebrationDialog result={result} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the Board' }));
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
