import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomeHero from './HomeHero';
import { renderWithProviders } from '../../testUtils';

describe('HomeHero', () => {
  it('renders the headline as the page heading', () => {
    renderWithProviders(<HomeHero />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Platforms, from the API to the cluster.'
    );
  });

  it('links its calls to action', () => {
    renderWithProviders(<HomeHero />);

    expect(screen.getByRole('link', { name: /Explore the projects/ })).toHaveAttribute(
      'href',
      '/projects'
    );
    expect(screen.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
  });

  it('settles the terminal flat under reduced motion', async () => {
    renderWithProviders(<HomeHero />);

    expect(await screen.findByLabelText('Terminal command input')).toBeInTheDocument();
    const section = screen.getByRole('heading', { level: 1 }).closest('section');
    expect(section?.style.getPropertyValue('--progress')).toBe('1');
  });
});
