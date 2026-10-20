import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import ConnectionStatus from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('stays hidden while live or first connecting', () => {
    const { rerender } = renderWithProviders(<ConnectionStatus status="live" onRetry={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<ConnectionStatus status="connecting" onRetry={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says it is reconnecting', () => {
    renderWithProviders(<ConnectionStatus status="reconnecting" onRetry={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('offers a retry once updates have stopped', () => {
    const onRetry = vi.fn();
    renderWithProviders(<ConnectionStatus status="failed" onRetry={onRetry} />);
    expect(screen.getByRole('status')).toHaveTextContent('Live updates paused');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
