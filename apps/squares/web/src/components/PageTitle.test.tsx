import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import PageTitle from './PageTitle';

describe('PageTitle', () => {
  it('renders the title as the page heading with its subtitle', () => {
    renderWithProviders(<PageTitle title="Leaderboard" subtitle="Ranked by quarter wins." />);

    expect(screen.getByRole('heading', { level: 1, name: 'Leaderboard' })).toBeInTheDocument();
    expect(screen.getByText('Ranked by quarter wins.')).toBeInTheDocument();
  });

  it('renders without a subtitle', () => {
    const { container } = renderWithProviders(<PageTitle title="Contact" align="left" />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
