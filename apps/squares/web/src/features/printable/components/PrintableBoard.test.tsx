import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import PrintableBoard from './PrintableBoard';

describe('PrintableBoard', () => {
  it('draws a blank 10x10 grid and leaves unnamed teams blank', () => {
    renderWithProviders(<PrintableBoard awayTeam="" homeTeam="" />);

    const board = screen.getByRole('table', { name: 'Squares board' });
    expect(within(board).getAllByRole('cell')).toHaveLength(100);
    expect(within(board).getAllByRole('columnheader')).toHaveLength(10);
    expect(within(board).getAllByRole('rowheader')).toHaveLength(10);
    const rows = within(board).getAllByRole('row');
    expect(rows).toHaveLength(11);
    expect(within(rows[0]).getAllByRole('columnheader')).toHaveLength(10);
    expect(screen.queryByText('Away')).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText(/00A0/)).not.toBeInTheDocument();
  });

  it('labels the teams and credits the site at the bottom', () => {
    renderWithProviders(<PrintableBoard awayTeam="Bears" homeTeam="Lions" />);

    expect(screen.getByText('Bears')).toBeInTheDocument();
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText(/squares\.maxhq\.io/)).toBeInTheDocument();
  });
});
