import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SectionNav from './SectionNav';
import { renderWithProviders } from '../../testUtils';

const items = [
  { id: 'first', label: 'First' },
  { id: 'second', label: 'Second' },
];

describe('SectionNav', () => {
  it('links to every section by anchor', () => {
    renderWithProviders(<SectionNav items={items} title="On this page" />);

    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Second' })).toHaveAttribute('href', '#second');
  });

  it('marks the first section current before any scrolling', () => {
    renderWithProviders(<SectionNav items={items} title="On this page" />);

    expect(screen.getByRole('link', { name: 'First' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'Second' })).not.toHaveAttribute('aria-current');
  });
});
