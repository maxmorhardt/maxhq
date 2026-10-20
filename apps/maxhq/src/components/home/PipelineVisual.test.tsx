import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PipelineVisual from './PipelineVisual';
import { renderWithProviders } from '../../testUtils';

describe('PipelineVisual', () => {
  it('lists every stage in order', () => {
    renderWithProviders(<PipelineVisual />);

    const stages = within(screen.getByRole('list', { name: 'Delivery pipeline' })).getAllByRole(
      'listitem'
    );
    expect(stages.map((stage) => stage.textContent)).toEqual([
      'Pull request mergedsquashed into main',
      'Checks passlint · types · tests',
      'Image builtsha-2369a65',
      'Argo CD syncs devgitops/clusters/dev',
      'Release to prodsame image, retagged',
    ]);
  });
});
