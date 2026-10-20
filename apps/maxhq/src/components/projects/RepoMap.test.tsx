import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RepoMap from './RepoMap';
import { renderWithProviders } from '../../testUtils';

describe('RepoMap', () => {
  it('lists every stop a change passes through, in order', () => {
    renderWithProviders(<RepoMap />);

    const map = screen.getByRole('list', { name: 'How a change reaches the clusters' });
    const stops = within(map)
      .getAllByRole('listitem')
      .filter((item) => item.parentElement === map);

    expect(stops.map((stop) => stop.querySelector('span')?.textContent)).toEqual([
      'maxhq',
      'workflows',
      'gitops',
      'clusters',
    ]);
  });

  it('labels each hop between them', () => {
    renderWithProviders(<RepoMap />);

    expect(screen.getByText('commits image tags')).toBeInTheDocument();
    expect(screen.getByText('argo cd syncs')).toBeInTheDocument();
  });
});
