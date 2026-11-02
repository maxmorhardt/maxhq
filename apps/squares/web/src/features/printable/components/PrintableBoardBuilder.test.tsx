import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import PrintableBoardBuilder from './PrintableBoardBuilder';

describe('PrintableBoardBuilder', () => {
  it('puts the team names on the board', () => {
    renderWithProviders(<PrintableBoardBuilder />);

    fireEvent.change(screen.getByLabelText('Away team'), { target: { value: 'Bears' } });
    fireEvent.change(screen.getByLabelText('Home team'), { target: { value: 'Lions' } });

    expect(screen.getByText('Bears')).toBeInTheDocument();
    expect(screen.getByText('Lions')).toBeInTheDocument();
  });

  it('opens the print dialog', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderWithProviders(<PrintableBoardBuilder />);

    fireEvent.click(screen.getByRole('button', { name: 'Print Board' }));
    expect(print).toHaveBeenCalled();
    print.mockRestore();
  });
});
