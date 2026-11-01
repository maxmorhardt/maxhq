import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ImpactList from './ImpactList';
import { renderWithProviders } from '../../testUtils';

describe('ImpactList', () => {
  it('renders every area with its context', () => {
    renderWithProviders(<ImpactList />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    expect(screen.getByText(/OpenAPI specs/)).toBeInTheDocument();
  });
});
