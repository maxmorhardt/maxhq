import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DayHeading from './DayHeading';

describe('DayHeading', () => {
  it('heads a day on the scoreboard', () => {
    render(<DayHeading day="Sunday, November 8" />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Sunday, November 8' })
    ).toBeInTheDocument();
  });

  it('sits a level lower under a compact week bar', () => {
    render(<DayHeading day="Sunday, November 8" compact />);

    expect(
      screen.getByRole('heading', { level: 4, name: 'Sunday, November 8' })
    ).toBeInTheDocument();
  });
});
