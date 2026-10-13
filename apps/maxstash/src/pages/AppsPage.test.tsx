import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppsPage from './AppsPage';
import { renderWithProviders } from '../testUtils';

describe('AppsPage', () => {
  it('renders the app as the page heading', () => {
    renderWithProviders(<AppsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Squares' })).toBeInTheDocument();
    expect(screen.getByText('Live app')).toBeInTheDocument();
  });

  it('links out to the live app', () => {
    renderWithProviders(<AppsPage />);

    const cta = screen.getByRole('link', { name: /Play Squares/ });
    expect(cta).toHaveAttribute('href', 'https://squares.maxstash.io');
    expect(cta).toHaveAttribute('target', '_blank');
  });

  it('renders the numbered play-by-play steps', () => {
    renderWithProviders(<AppsPage />);

    expect(screen.getByRole('heading', { name: 'How a game plays out' })).toBeInTheDocument();

    for (const name of [
      'Set up the board',
      'Friends claim squares',
      'Numbers are drawn',
      'Winners light up',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('renders the perks strip', () => {
    renderWithProviders(<AppsPage />);

    expect(screen.getByRole('heading', { name: 'Nothing to install' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'One sign-in' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live updates' })).toBeInTheDocument();
  });

  it('links to the legal pages', () => {
    renderWithProviders(<AppsPage />);

    expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
      'href',
      '/terms-of-service'
    );
    expect(screen.getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute(
      'href',
      '/privacy-policy'
    );
  });
});
