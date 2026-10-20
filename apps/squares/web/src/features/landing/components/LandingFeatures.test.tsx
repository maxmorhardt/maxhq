import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import LandingFeatures from './LandingFeatures';

describe('LandingFeatures', () => {
  it('renders every feature', () => {
    renderWithProviders(<LandingFeatures />);

    for (const name of [
      'Live on every screen',
      'Real scores, called for you',
      'Your pool, your rules',
      'Free, with nothing to install',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('shows an example activity feed ending in a winner', () => {
    renderWithProviders(<LandingFeatures />);

    const feed = screen.getByRole('figure', { name: 'Example contest activity' });
    expect(feed).toHaveTextContent('wins the 2nd quarter');
  });
});
