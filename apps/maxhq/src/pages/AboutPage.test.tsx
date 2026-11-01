import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AboutPage from './AboutPage';
import { renderWithProviders } from '../testUtils';

describe('AboutPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
  });

  it('renders each labelled row', () => {
    renderWithProviders(<AboutPage />);

    for (const label of ['Experience', 'Education']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        expect.stringMatching(/^#/)
      );
    }
  });

  it('renders the employer and both roles', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('heading', { name: 'Fidelity Investments' })).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Associate Software Engineer')).toBeInTheDocument();
  });
});
