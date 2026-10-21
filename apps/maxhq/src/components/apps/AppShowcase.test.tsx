import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppShowcase, { type AppEntry, UpNextTile } from './AppShowcase';
import { renderWithProviders } from '../../testUtils';

const app: AppEntry = {
  id: 'pool',
  name: 'Pool',
  tagline: 'A tagline',
  description: 'A description',
  href: 'https://pool.maxhq.io',
  status: 'Live',
  features: [{ title: 'Fast', body: 'It is fast.' }],
  visual: <div>the visual</div>,
};

describe('AppShowcase', () => {
  it('renders the app with its features, visual, and a link out', () => {
    renderWithProviders(<AppShowcase app={app} />);

    expect(screen.getByRole('article', { name: 'Pool' })).toHaveAttribute('id', 'pool');
    expect(screen.getByRole('heading', { name: 'Fast' })).toBeInTheDocument();
    expect(screen.getByText('the visual')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Pool/ })).toHaveAttribute(
      'href',
      'https://pool.maxhq.io'
    );
  });

  it('uses the custom call to action and renders the extra content', () => {
    renderWithProviders(
      <AppShowcase app={{ ...app, cta: 'Play Pool', extra: <p>more</p> }} flip />
    );

    expect(screen.getByRole('link', { name: /Play Pool/ })).toBeInTheDocument();
    expect(screen.getByText('more')).toBeInTheDocument();
  });

  it('holds back the link while an app is in development', () => {
    renderWithProviders(<AppShowcase app={{ ...app, status: 'In development' }} />);

    expect(screen.getByText('In development')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the up next tile', () => {
    renderWithProviders(<UpNextTile />);

    expect(screen.getByRole('heading', { name: 'More apps are on the way' })).toBeInTheDocument();
  });
});
