import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectsPage from './ProjectsPage';
import { renderWithProviders } from '../testUtils';

describe('ProjectsPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<ProjectsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
  });

  it('renders both section headings', () => {
    renderWithProviders(<ProjectsPage />);

    expect(screen.getByRole('heading', { name: 'Under the hood' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The repositories' })).toBeInTheDocument();
  });

  it('maps how a change reaches the clusters', () => {
    renderWithProviders(<ProjectsPage />);

    expect(
      screen.getByRole('list', { name: 'How a change reaches the clusters' })
    ).toBeInTheDocument();
  });

  it('renders a card for every repository', () => {
    renderWithProviders(<ProjectsPage />);

    const names = ['squares', 'squares services', 'maxhq.io', 'charts', 'gitops', 'workflows'];
    for (const name of names) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
  });

  it('points the gitops card at the gitops repo and the Terraform in maxhq', () => {
    renderWithProviders(<ProjectsPage />);

    const links = screen.getAllByRole('link', { name: 'View on GitHub' });
    expect(links.map((a) => a.getAttribute('href'))).toContain(
      'https://github.com/maxmorhardt/gitops'
    );
    expect(screen.getByRole('link', { name: /Terraform & bootstrap/ })).toHaveAttribute(
      'href',
      'https://github.com/maxmorhardt/maxhq/tree/main/infra'
    );
  });

  it('lists the site with its react stack', () => {
    renderWithProviders(<ProjectsPage />);

    expect(screen.getByText('React 19')).toBeInTheDocument();
    expect(screen.getByText('Material UI')).toBeInTheDocument();
  });
});
