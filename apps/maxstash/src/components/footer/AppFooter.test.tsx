import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppFooter from './AppFooter';
import { renderWithProviders } from '../../testUtils';

afterEach(() => {
  vi.useRealTimers();
});

describe('AppFooter', () => {
  it('renders the current year in the copyright', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-03-04T00:00:00Z'));

    renderWithProviders(<AppFooter />);

    expect(screen.getByText('© 2031 Max Morhardt')).toBeInTheDocument();
  });

  it('renders each social link with the right href', () => {
    renderWithProviders(<AppFooter />);

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/maxmorhardt'
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/max-morhardt-60b9121b8/'
    );
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:max@maxstash.io'
    );
  });

  it('opens external links in a new tab', () => {
    renderWithProviders(<AppFooter />);

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('rel', 'noreferrer');
  });
});
