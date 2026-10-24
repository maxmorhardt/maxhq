import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders the compact value and label', () => {
    render(<StatCard icon={<span />} value={1234} label="Squares Claimed" />);
    expect(screen.getByText('1.2K')).toHaveAttribute('title', '1,234');
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

describe('StatCard progress', () => {
  it('draws a ring for a share and none without one', () => {
    const { container, rerender } = render(
      <StatCard icon={<span />} value={5} label="Quarter Wins" progress={25} highlight />
    );
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

    rerender(<StatCard icon={<span />} value={5} label="Quarter Wins" />);
    expect(container.querySelector('.MuiCircularProgress-root')).not.toBeInTheDocument();
  });
});
