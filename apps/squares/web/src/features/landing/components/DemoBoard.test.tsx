import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import DemoBoard from './DemoBoard';

describe('DemoBoard', () => {
  it('describes an empty board before anyone joins', () => {
    renderWithProviders(<DemoBoard stage={0} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/empty ten by ten squares board/i);
    expect(screen.getByText('Pregame')).toBeInTheDocument();
  });

  it('hides the digits until they are drawn', () => {
    renderWithProviders(<DemoBoard stage={1} />);

    expect(screen.getAllByText('–')).toHaveLength(20);
  });

  it('fills the whole board before any digits are drawn', () => {
    renderWithProviders(<DemoBoard stage={2} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/full board waiting for kickoff/i);
    expect(screen.getAllByText('–')).toHaveLength(20);
  });

  it('shows the drawn digits along both axes', () => {
    renderWithProviders(<DemoBoard stage={3} />);

    expect(screen.queryAllByText('–')).toHaveLength(0);
    expect(screen.getByText('1st · 15:00')).toBeInTheDocument();
  });

  it('calls the quarter with the final score', () => {
    renderWithProviders(<DemoBoard stage={4} />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/away 7 and home 14/i);
    expect(screen.getByText('End Q2')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });
});
