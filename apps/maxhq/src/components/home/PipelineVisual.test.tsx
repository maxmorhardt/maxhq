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
      'Checks passlint · tests · scans',
      'Merged to mainone squash commit',
      'Image builttagged sha-2369a65',
      'Live on devArgo CD syncs gitops',
      'Promoted to prodsame image, on release',
    ]);
  });
});
