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

  it('renders every platform feature', () => {
    renderWithProviders(<ProjectsPage />);

    for (const name of [
      'Federated single sign-on',
      'Real-time everywhere',
      'Self-hosted on Kubernetes',
      'Continuous delivery',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('renders a card for every repository', () => {
    renderWithProviders(<ProjectsPage />);

    for (const name of ['squares', 'squares-api', 'k8s', 'charts', 'workflows', 'maxstash']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('lists maxstash with its react stack', () => {
    renderWithProviders(<ProjectsPage />);

    expect(screen.getByText('React 19')).toBeInTheDocument();
    expect(screen.getByText('Emotion')).toBeInTheDocument();
  });
});
