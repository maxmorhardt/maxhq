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

  it('shows an example feed in the words the real contest feed uses', () => {
    renderWithProviders(<LandingFeatures />);

    const feed = screen.getByRole('figure', { name: 'Example contest activity' });
    expect(feed).toHaveTextContent('Jordan D. joined the contest');
    expect(feed).not.toHaveTextContent('@');
    expect(feed).toHaveTextContent('Jordan claimed square (4, 7)');
    expect(feed).toHaveTextContent('Contest status changed to Q1');
    expect(feed).toHaveTextContent('Q2 winner: Jordan (14-7)');
  });
});
