import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppsPage from './AppsPage';
import { renderWithProviders } from '../testUtils';

describe('AppsPage', () => {
  it('renders the page heading and an index of the apps', () => {
    renderWithProviders(<AppsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Apps' })).toBeInTheDocument();
    const index = screen.getByRole('navigation', { name: 'Apps on maxhq' });
    expect(within(index).getByRole('link', { name: /Squares/ })).toHaveAttribute(
      'href',
      '#squares'
    );
  });

  it('presents squares with a link out to the live app', () => {
    renderWithProviders(<AppsPage />);

    const squares = screen.getByRole('article', { name: 'Squares' });
    expect(within(squares).getByRole('link', { name: /Play Squares/ })).toHaveAttribute(
      'href',
      'https://squares.maxhq.io'
    );
    expect(
      within(squares).getByRole('heading', { name: 'How a game plays out' })
    ).toBeInTheDocument();
    expect(within(squares).getByRole('heading', { name: 'Winners light up' })).toBeInTheDocument();
  });

  it('explains what signing in with Google shares and what it is used for', () => {
    renderWithProviders(<AppsPage />);

    const data = screen.getByRole('region', { name: 'Your account and your data' });
    for (const term of ['Your name', 'Your email address', 'Your account ID']) {
      expect(within(data).getByText(term)).toBeInTheDocument();
    }
    expect(within(data).getByText(/don’t sell your information/)).toBeInTheDocument();
    expect(within(data).getByRole('link', { name: 'support@maxhq.io' })).toHaveAttribute(
      'href',
      'mailto:support@maxhq.io'
    );
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
