import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContactPage from './ContactPage';
import { renderWithProviders } from '../testUtils';

describe('ContactPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument();
  });

  it('renders a card for every channel', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/maxmorhardt'
    );
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/max-morhardt-60b9121b8/'
    );
    expect(screen.getByRole('link', { name: /Email/ })).toHaveAttribute(
      'href',
      'mailto:max@maxstash.io'
    );
  });

  it('renders each handle', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByText('@maxmorhardt')).toBeInTheDocument();
    expect(screen.getByText('max@maxstash.io')).toBeInTheDocument();
  });
});
