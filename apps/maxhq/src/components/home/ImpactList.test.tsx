import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ImpactList from './ImpactList';
import { renderWithProviders } from '../../testUtils';

describe('ImpactList', () => {
  it('renders every figure with its context', () => {
    renderWithProviders(<ImpactList />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('15 → 2 min')).toBeInTheDocument();
    expect(screen.getByText(/Bootstrap to PrimeNG/)).toBeInTheDocument();
  });
});
