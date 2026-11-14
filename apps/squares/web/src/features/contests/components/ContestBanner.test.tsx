import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import ContestBanner from './ContestBanner';

describe('ContestBanner', () => {
  it('shows the message with an optional header and action', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <ContestBanner
        header={<span>steps</span>}
        message="Do the thing."
        action={{ label: 'Go', icon: null, onClick }}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('stepsDo the thing.Go');
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('is just the message without extras', () => {
    renderWithProviders(<ContestBanner message="Heads up." />);
    expect(screen.getByRole('status')).toHaveTextContent('Heads up.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
