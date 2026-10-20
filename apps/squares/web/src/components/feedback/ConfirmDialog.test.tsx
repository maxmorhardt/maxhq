import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import ConfirmDialog from './ConfirmDialog';

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <ConfirmDialog
      open
      title="Delete it?"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    >
      This cannot be undone.
    </ConfirmDialog>
  );
  return { onConfirm, onClose };
}

describe('ConfirmDialog', () => {
  it('asks and confirms', () => {
    const { onConfirm } = renderDialog();
    expect(screen.getByText('Delete it?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cancels from either close control', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('locks while working and shows an error', () => {
    renderDialog({ loading: true, error: 'It failed' });
    expect(screen.getByText('It failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
