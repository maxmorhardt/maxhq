import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppDirectory from './AppDirectory';
import type { AppEntry } from './AppShowcase';
import { renderWithProviders } from '../../testUtils';

const app = (id: string, overrides: Partial<AppEntry> = {}): AppEntry => ({
  id,
  name: id,
  tagline: `${id} tagline`,
  icon: <span />,
  description: '',
  href: `https://${id}.maxhq.io`,
  status: 'Live',
  features: [],
  visual: null,
  ...overrides,
});

describe('AppDirectory', () => {
  it('renders a tile per app that jumps to its details and opens the app', () => {
    renderWithProviders(<AppDirectory apps={[app('pool', { cta: 'Play Pool' })]} />);

    const tiles = screen.getAllByRole('listitem');
    expect(within(tiles[0]).getByRole('link', { name: 'pool' })).toHaveAttribute('href', '#pool');
    expect(within(tiles[0]).getByRole('link', { name: /Play Pool/ })).toHaveAttribute(
      'href',
      'https://pool.maxhq.io'
    );
    expect(within(tiles[0]).getByText('pool tagline')).toBeInTheDocument();
  });

  it('only links out to live apps', () => {
    renderWithProviders(<AppDirectory apps={[app('draft', { status: 'In development' })]} />);

    expect(screen.getByText('In development')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open draft/ })).not.toBeInTheDocument();
  });

  it('keeps a place for the next app', () => {
    renderWithProviders(<AppDirectory apps={[app('a'), app('b'), app('c')]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'More apps on the way' })).toBeInTheDocument();
  });
});
