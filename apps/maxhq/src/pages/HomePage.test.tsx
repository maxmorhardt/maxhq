import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './HomePage';
import { renderWithProviders } from '../testUtils';

describe('HomePage', () => {
  it('renders the hero heading and introduces Max by name', () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Platforms, from the API to the cluster.' })
    ).toBeInTheDocument();
    expect(screen.getByText('Max Morhardt')).toBeInTheDocument();
  });

  it('renders the build, ship, and run chapters', () => {
    renderWithProviders(<HomePage />);

    for (const name of ['Build it end to end.', 'Ship it on merge.', 'Run it myself.']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('renders the remaining section headings', () => {
    renderWithProviders(<HomePage />);

    for (const name of [
      'What the day job moved.',
      'Tools of the trade',
      "Building something? Let's talk.",
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('links the calls to action to contact, projects, and about', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole('link', { name: /Send a message/ })).toHaveAttribute(
      'href',
      '/contact'
    );
    expect(screen.getByRole('link', { name: /Browse the projects/ })).toHaveAttribute(
      'href',
      '/projects'
    );
    expect(screen.getByRole('link', { name: /The full story/ })).toHaveAttribute('href', '/about');
  });
});
