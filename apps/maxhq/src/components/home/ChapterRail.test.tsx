import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChapterRail, { type Chapter } from './ChapterRail';
import { renderWithProviders } from '../../testUtils';

const chapters: Chapter[] = [
  { id: 'one', icon: <span />, title: 'First', body: 'first body', visual: <p>first visual</p> },
  {
    id: 'two',
    icon: <span />,
    title: 'Second',
    body: 'second body',
    visual: <p>second visual</p>,
  },
];

describe('ChapterRail', () => {
  it('renders each chapter as an article labelled by its heading', () => {
    renderWithProviders(<ChapterRail chapters={chapters} />);

    expect(screen.getByRole('article', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Second' })).toBeInTheDocument();
  });

  it('renders each chapter body and visual', () => {
    renderWithProviders(<ChapterRail chapters={chapters} />);

    expect(screen.getByText('second body')).toBeInTheDocument();
    expect(screen.getByText('first visual')).toBeInTheDocument();
  });

  // jsdom has no IntersectionObserver, so every node lights immediately
  it('lights the node beside each chapter', () => {
    const { container } = renderWithProviders(<ChapterRail chapters={chapters} />);

    expect(container.querySelectorAll('[data-active]')).toHaveLength(2);
  });
});
