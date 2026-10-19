import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './HomePage';
import { renderWithProviders } from '../testUtils';

describe('HomePage', () => {
  it('renders the visually hidden h1 for crawlers', () => {
    renderWithProviders(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Max Morhardt, Software Engineer' })
    ).toBeInTheDocument();
  });

  it('renders the section headings', () => {
    renderWithProviders(<HomePage />);

    for (const name of ['What I do', 'Tools of the trade', 'How I work']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('renders every highlight card', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Full-stack engineering' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Cloud and Kubernetes platforms' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Real-time and self-hosted systems' })
    ).toBeInTheDocument();
  });

  it('renders stack chips', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('Spring Boot')).toBeInTheDocument();
  });

  it('links the calls to action to contact and projects', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole('link', { name: /Send a message/ })).toHaveAttribute(
      'href',
      '/contact'
    );
    expect(screen.getByRole('link', { name: /Browse the projects/ })).toHaveAttribute(
      'href',
      '/projects'
    );
  });
});
