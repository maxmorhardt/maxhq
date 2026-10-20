import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StepTrack from './StepTrack';
import { renderWithProviders } from '../../testUtils';

const steps = [
  { title: 'First', body: 'first body' },
  { title: 'Second', body: 'second body' },
];

describe('StepTrack', () => {
  it('renders the steps in order', () => {
    renderWithProviders(<StepTrack steps={steps} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent('Second');
  });

  it('lights the whole track under reduced motion', () => {
    renderWithProviders(<StepTrack steps={steps} />);

    expect(screen.getByRole('list').style.getPropertyValue('--progress')).toBe('1');
  });
});
