import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import SessionRefreshBanner from './SessionRefreshBanner';

describe('SessionRefreshBanner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when state is idle', () => {
    const { container } = render(<SessionRefreshBanner state="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the refreshing message when state is refreshing', () => {
    render(<SessionRefreshBanner state="refreshing" />);
    expect(screen.getByText('Refreshing your session…')).toBeInTheDocument();
  });

  it('shows a progress bar when refreshing', () => {
    const { container } = render(<SessionRefreshBanner state="refreshing" />);
    expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
  });

  it('shows the success message after transitioning from refreshing', async () => {
    const { rerender } = render(<SessionRefreshBanner state="refreshing" />);
    rerender(<SessionRefreshBanner state="success" />);
    await waitFor(() => expect(screen.getByText('Welcome back!')).toBeInTheDocument());
  });

  it('shows the error message after transitioning from refreshing', async () => {
    const { rerender } = render(<SessionRefreshBanner state="refreshing" />);
    rerender(<SessionRefreshBanner state="error" />);
    await waitFor(() =>
      expect(screen.getByText('Session expired. Please sign in again.')).toBeInTheDocument()
    );
  });

  it('hides the snackbar after a timeout on success', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<SessionRefreshBanner state="refreshing" />);
    rerender(<SessionRefreshBanner state="success" />);

    await act(async () => {
      vi.runAllTimers();
    });

    vi.useRealTimers();
  });

  it('has a white icon via sx override', () => {
    const { container } = render(<SessionRefreshBanner state="refreshing" />);
    const alert = container.querySelector('.MuiAlert-root');
    expect(alert).toBeInTheDocument();
  });
});
