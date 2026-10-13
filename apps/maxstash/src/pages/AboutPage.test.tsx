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

    for (const label of ['Experience', 'Project', 'Homelab platform', 'This site', 'Education']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders the employer and both roles', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('heading', { name: 'Fidelity Investments' })).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Associate Software Engineer')).toBeInTheDocument();
  });

  it('links to the squares project', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByRole('link', { name: 'Live site' })).toHaveAttribute(
      'href',
      'https://squares.maxstash.io'
    );
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/maxmorhardt/squares'
    );
  });

  it('describes this site as the react stack it now runs on', () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByText('React 19')).toBeInTheDocument();
    expect(screen.getByText('Material UI')).toBeInTheDocument();
  });
});
