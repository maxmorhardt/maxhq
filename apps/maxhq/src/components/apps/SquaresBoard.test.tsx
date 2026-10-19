import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SquaresBoard from './SquaresBoard';
import { renderWithProviders } from '../../testUtils';

describe('SquaresBoard', () => {
  it('renders the claimed initials', () => {
    renderWithProviders(<SquaresBoard />);

    for (const initials of ['MM', 'AK', 'JD', 'SR', 'TL', 'BW', 'CG', 'RP']) {
      expect(screen.getByText(initials)).toBeInTheDocument();
    }
  });

  it('renders the axis numbers for both teams', () => {
    renderWithProviders(<SquaresBoard />);

    // 3, 7, 1, 9, 4 across the top and 2, 8, 0, 5, 6 down the side
    for (const n of ['3', '7', '1', '9', '4', '2', '8', '0', '5', '6']) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it('captions the winning square with the score digits it sits on', () => {
    renderWithProviders(<SquaresBoard />);

    // the winner cell is row 2 / col 2, so home 0 and away 1
    expect(screen.getByText(/Q3 winner · home 0, away 1/)).toBeInTheDocument();
  });

  it('is hidden from assistive tech as decoration', () => {
    const { container } = renderWithProviders(<SquaresBoard />);

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
