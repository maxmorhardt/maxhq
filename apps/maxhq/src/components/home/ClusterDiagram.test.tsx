import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClusterDiagram from './ClusterDiagram';
import { renderWithProviders } from '../../testUtils';

describe('ClusterDiagram', () => {
  it('describes the topology for assistive tech in both layouts', () => {
    renderWithProviders(<ClusterDiagram />);

    const diagrams = screen.getAllByRole('img');
    expect(diagrams).toHaveLength(2);
    expect(diagrams[0]).toHaveAccessibleName(/Envoy Gateway/);
  });

  it('labels every component of the cluster', () => {
    renderWithProviders(<ClusterDiagram />);

    for (const label of ['Cloudflare', 'Dex', 'Argo CD', 'realtime', 'PostgreSQL', 'Valkey']) {
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
  });
});
