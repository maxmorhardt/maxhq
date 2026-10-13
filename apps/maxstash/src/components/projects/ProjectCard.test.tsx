import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectCard, { type Project } from './ProjectCard';
import { renderWithProviders } from '../../testUtils';

const project: Project = {
  name: 'squares',
  category: 'Frontend',
  description: 'Real-time NFL squares platform.',
  href: 'https://github.com/maxmorhardt/squares',
  links: [{ label: 'Live site', href: 'https://squares.maxstash.io' }],
  tags: ['React', 'TypeScript'],
};

describe('ProjectCard', () => {
  it('renders the name, category, and description', () => {
    renderWithProviders(<ProjectCard project={project} />);

    expect(screen.getByRole('heading', { name: 'squares' })).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Real-time NFL squares platform.')).toBeInTheDocument();
  });

  it('renders every tag', () => {
    renderWithProviders(<ProjectCard project={project} />);

    for (const tag of project.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it('links to the repository', () => {
    renderWithProviders(<ProjectCard project={project} />);

    expect(screen.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/maxmorhardt/squares'
    );
  });

  it('renders external links when present', () => {
    renderWithProviders(<ProjectCard project={project} />);

    const link = screen.getByRole('link', { name: 'Live site' });
    expect(link).toHaveAttribute('href', 'https://squares.maxstash.io');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('omits the links row when a project has none', () => {
    const { links, ...withoutLinks } = project;
    void links;

    renderWithProviders(<ProjectCard project={withoutLinks} />);

    expect(screen.queryByRole('link', { name: 'Live site' })).not.toBeInTheDocument();
  });

  it('keeps the repo link reachable from the card header', () => {
    renderWithProviders(<ProjectCard project={project} />);

    const heading = screen.getByRole('heading', { name: 'squares' });
    expect(within(heading).queryByRole('link')).toBeNull();
  });
});
