import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectRow, { type Project } from './ProjectRow';
import { renderWithProviders } from '../../testUtils';

const project: Project = {
  name: 'squares',
  category: 'App',
  description: 'Real-time NFL squares platform.',
  href: 'https://github.com/maxmorhardt/squares',
  links: [{ label: 'Live site', href: 'https://squares.maxhq.io' }],
  tags: ['React', 'TypeScript'],
};

function renderRow(row: Project = project, index = 0) {
  return renderWithProviders(
    <ol>
      <ProjectRow project={row} index={index} />
    </ol>
  );
}

describe('ProjectRow', () => {
  it('renders the number, category, name, and description', () => {
    renderRow(project, 4);

    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'squares' })).toBeInTheDocument();
    expect(screen.getByText('Real-time NFL squares platform.')).toBeInTheDocument();
  });

  it('lists the stack on one line', () => {
    renderRow();

    expect(screen.getByText(/React\s+·\s+TypeScript/)).toBeInTheDocument();
  });

  it('opens the repository from the name and the repository link', () => {
    renderRow();

    for (const name of ['squares', /Repository/]) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', 'https://github.com/maxmorhardt/squares');
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('renders extra links when present', () => {
    renderRow();

    expect(screen.getByRole('link', { name: /Live site/ })).toHaveAttribute(
      'href',
      'https://squares.maxhq.io'
    );
  });

  it('shows only the repository link when a project has no others', () => {
    const { links, ...withoutLinks } = project;
    void links;
    renderRow(withoutLinks);

    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
