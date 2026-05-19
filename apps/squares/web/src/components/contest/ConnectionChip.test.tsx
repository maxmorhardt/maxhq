import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionChip from './ConnectionChip';

describe('ConnectionChip', () => {
  it('shows "Live" when status is connected', () => {
    render(<ConnectionChip status="connected" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows reconnecting label with retry count', () => {
    render(<ConnectionChip status="reconnecting" retryCount={3} />);
    expect(screen.getByText('Reconnecting (3)')).toBeInTheDocument();
  });

  it('shows "Connection Failed" when status is failed', () => {
    render(<ConnectionChip status="failed" />);
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
  });

  it('shows "Connecting" for the default status', () => {
    render(<ConnectionChip status="connecting" />);
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });
});
