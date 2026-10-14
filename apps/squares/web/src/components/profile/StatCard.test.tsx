import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders the formatted value and label', () => {
    render(<StatCard icon={<span />} value={1234} label="Squares Claimed" />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Squares Claimed')).toBeInTheDocument();
  });

  it('renders a dash when the value is undefined', () => {
    render(<StatCard icon={<span />} value={undefined} label="Quarter Wins" />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('renders the caption only when provided', () => {
    const { rerender } = render(
      <StatCard icon={<span />} value={5} label="Wins" caption="50% win rate" />
    );
    expect(screen.getByText('50% win rate')).toBeInTheDocument();

    rerender(<StatCard icon={<span />} value={5} label="Wins" />);
    expect(screen.queryByText('50% win rate')).not.toBeInTheDocument();
  });
});
