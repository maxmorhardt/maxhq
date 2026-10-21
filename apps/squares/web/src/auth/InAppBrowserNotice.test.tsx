import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InAppBrowserNotice from './InAppBrowserNotice';

const userAgent = (ua: string) => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);

describe('InAppBrowserNotice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays out of the way in a real browser', () => {
    const { container } = render(<InAppBrowserNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains the Google block and copies the link inside an app', async () => {
    userAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Instagram 350.0');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<InAppBrowserNotice />);

    expect(screen.getByRole('alert')).toHaveTextContent(/Google sign-in doesn't work/);
    expect(screen.queryByRole('link', { name: /open in chrome/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /link copied/i })).toBeInTheDocument()
    );
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it('offers to reopen the page in Chrome on Android', () => {
    userAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/129.0');
    render(<InAppBrowserNotice />);
    expect(screen.getByRole('link', { name: /open in chrome/i })).toHaveAttribute(
      'href',
      expect.stringContaining('package=com.android.chrome')
    );
  });

  it('keeps the copy button when the clipboard is refused', async () => {
    userAgent('Mozilla/5.0 Instagram 350.0');
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    render(<InAppBrowserNotice />);
    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
    );
  });
});
