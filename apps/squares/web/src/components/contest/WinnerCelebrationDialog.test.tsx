import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WinnerCelebrationDialog from './WinnerCelebrationDialog';

const data = { quarter: 2, homeScore: 21, awayScore: 14, row: 3, col: 5 };

describe('WinnerCelebrationDialog', () => {
  it('renders nothing when data is null', () => {
    render(<WinnerCelebrationDialog data={null} onClose={vi.fn()} />);
    expect(screen.queryByText('You Won!')).not.toBeInTheDocument();
  });

  it('renders winner details when data is provided', () => {
    render(<WinnerCelebrationDialog data={data} onClose={vi.fn()} />);
    expect(screen.getByText('You Won!')).toBeInTheDocument();
    expect(screen.getByText(/Quarter 2/)).toBeInTheDocument();
  });

  it('calls onClose when the "Let\'s Go!" button is clicked', () => {
    const onClose = vi.fn();
    render(<WinnerCelebrationDialog data={data} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /let's go/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the close icon button is clicked', () => {
    const onClose = vi.fn();
    render(<WinnerCelebrationDialog data={data} onClose={onClose} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
