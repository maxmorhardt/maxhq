import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContestPageSkeleton from './ContestPageSkeleton';

describe('ContestPageSkeleton', () => {
  it('renders with the default "Connecting" chip', () => {
    render(<ContestPageSkeleton />);
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('renders "Live" chip when connectionStatus is connected', () => {
    render(<ContestPageSkeleton connectionStatus="connected" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders "Connection Failed" chip when connection fails', () => {
    render(<ContestPageSkeleton connectionStatus="failed" />);
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
  });
});
