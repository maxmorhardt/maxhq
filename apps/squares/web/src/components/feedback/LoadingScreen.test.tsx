import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the title', () => {
    render(<LoadingScreen title="Loading Contest" subtitle="Please wait..." />);
    expect(screen.getByText('Loading Contest')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<LoadingScreen title="Loading Contest" subtitle="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders a progress spinner', () => {
    const { container } = render(<LoadingScreen title="Loading" subtitle="..." />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
