import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppsPage from './AppsPage';
import { renderWithProviders } from '../testUtils';

describe('AppsPage', () => {
  it('renders the page heading and a directory of the apps', () => {
    renderWithProviders(<AppsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Apps' })).toBeInTheDocument();
    const directory = screen.getByRole('list', { name: 'Apps' });
    expect(within(directory).getByRole('link', { name: 'Squares' })).toHaveAttribute(
      'href',
      '#squares'
    );
    expect(within(directory).getByText('More apps on the way')).toBeInTheDocument();
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

  it('explains what signing in shares and what it is used for', () => {
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

  it('stays generic across sign-in providers', () => {
    renderWithProviders(<AppsPage />);

    const data = screen.getByRole('region', { name: 'Your account and your data' });
    expect(
      within(data).getByText(/already have with Google, Microsoft, or GitHub/)
    ).toBeInTheDocument();
    expect(within(data).getByRole('link', { name: 'Google' })).toHaveAttribute(
      'href',
      'https://myaccount.google.com/connections'
    );
    expect(within(data).getByRole('link', { name: 'Microsoft' })).toHaveAttribute(
      'href',
      'https://account.live.com/consent/Manage'
    );
    expect(within(data).getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/settings/applications'
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
