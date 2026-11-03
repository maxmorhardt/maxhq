import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import WeekBar, { WeekBarSkeleton } from './WeekBar';

const previous = { season: 2026, seasonType: 2, week: 9 };
const next = { season: 2026, seasonType: 2, week: 11 };

describe('WeekBar', () => {
  it('names the week and steps either side', () => {
    const onWeek = vi.fn();
    renderWithProviders(
      <WeekBar
        label="Week 10"
        detail="Nov 5 – Nov 9"
        previous={previous}
        next={next}
        onWeek={onWeek}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Week 10' })).toBeInTheDocument();
    expect(screen.getByText('Nov 5 – Nov 9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(onWeek).toHaveBeenCalledWith(previous);
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onWeek).toHaveBeenCalledWith(next);
  });

  it('stops at the ends of the calendar and while disabled', () => {
    const { rerender } = renderWithProviders(<WeekBar label="" next={next} onWeek={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'This Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled();

    rerender(<WeekBar label="Week 10" next={next} onWeek={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('uses a smaller heading in compact form', () => {
    renderWithProviders(<WeekBar compact label="Week 10" onWeek={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Week 10' })).toBeInTheDocument();
  });

  it('has a placeholder with the same frame', () => {
    const { container } = renderWithProviders(<WeekBarSkeleton compact />);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4);
  });
});
