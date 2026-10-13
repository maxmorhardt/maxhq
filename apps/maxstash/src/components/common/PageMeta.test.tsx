import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageMeta from './PageMeta';
import { renderWithProviders } from '../../testUtils';

const meta = (selector: string) => document.head.querySelector(selector);

describe('PageMeta', () => {
  it('sets the title, description, and social tags', async () => {
    renderWithProviders(<PageMeta title="Title here" description="Description here" />);

    await waitFor(() => expect(document.title).toBe('Title here'));

    expect(meta('meta[name="description"]')).toHaveAttribute('content', 'Description here');
    expect(meta('meta[property="og:title"]')).toHaveAttribute('content', 'Title here');
    expect(meta('meta[name="twitter:description"]')).toHaveAttribute('content', 'Description here');
  });

  it('defaults robots to index, follow', async () => {
    renderWithProviders(<PageMeta title="T" description="D" />);

    await waitFor(() =>
      expect(meta('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
    );
  });

  it('honors an explicit robots value', async () => {
    renderWithProviders(<PageMeta title="T" description="D" robots="noindex, follow" />);

    await waitFor(() =>
      expect(meta('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    );
  });

  it('emits canonical and og:url only when a canonical url is given', async () => {
    const { unmount } = renderWithProviders(
      <PageMeta title="T" description="D" canonical="https://maxstash.io/about" />
    );

    await waitFor(() =>
      expect(meta('link[rel="canonical"]')).toHaveAttribute('href', 'https://maxstash.io/about')
    );
    expect(meta('meta[property="og:url"]')).toHaveAttribute('content', 'https://maxstash.io/about');

    unmount();

    renderWithProviders(<PageMeta title="T" description="D" />);

    await waitFor(() => expect(meta('link[rel="canonical"]')).toBeNull());
  });
});
