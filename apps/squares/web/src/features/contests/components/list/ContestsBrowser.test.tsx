import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import type { ContestSummary } from '../../../../types/contest';
import ContestsBrowser, { ContestsBrowserSkeleton } from './ContestsBrowser';

const api = vi.hoisted(() => ({ useGetContestFeedInfiniteQuery: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('./ContestsTable', () => ({
  default: ({
    contests,
    emptyTitle,
    footer,
  }: {
    contests: ContestSummary[];
    emptyTitle?: string;
    footer: unknown;
  }) => (
    <div data-testid="table">
      {contests.map((c) => c.name).join(',') || emptyTitle || 'empty'}
      {footer as never}
    </div>
  ),
}));

const fetchNextPage = vi.fn();

function feed(overrides: Record<string, unknown> = {}) {
  api.useGetContestFeedInfiniteQuery.mockReturnValue({
    data: {
      pages: [
        { contests: [{ id: 'a', name: 'Alpha' }] },
        { contests: [{ id: 'b', name: 'Beta' }] },
      ],
    },
    error: undefined,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage,
    ...overrides,
  });
}

const lastFilters = () => api.useGetContestFeedInfiniteQuery.mock.calls.at(-1)?.[0];

describe('ContestsBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    feed();
  });

  it('shows every page of contests', () => {
    renderWithProviders(<ContestsBrowser />);
    expect(screen.getByTestId('table')).toHaveTextContent('Alpha,Beta');
    expect(screen.getByRole('link', { name: 'Create Contest' })).toHaveAttribute(
      'href',
      '/contests/create'
    );
  });

  it('shows a skeleton on the first load', () => {
    feed({ isLoading: true, data: undefined });
    renderWithProviders(<ContestsBrowser />);
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('filters by role and status', () => {
    renderWithProviders(<ContestsBrowser />);
    expect(lastFilters()).toEqual({ role: undefined, status: undefined, search: undefined });

    fireEvent.click(screen.getByRole('button', { name: 'Created' }));
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));

    expect(lastFilters()).toEqual({ role: 'owned', status: 'live', search: undefined });
  });

  it('debounces the search', () => {
    vi.useFakeTimers();
    renderWithProviders(<ContestsBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Search contests...'), {
      target: { value: ' bowl ' },
    });
    expect(lastFilters()?.search).toBeUndefined();

    act(() => vi.advanceTimersByTime(500));
    expect(lastFilters()?.search).toBe('bowl');
  });

  it('says when filters match nothing', () => {
    feed({ data: { pages: [{ contests: [] }] } });
    renderWithProviders(<ContestsBrowser />);
    fireEvent.click(screen.getByRole('button', { name: 'Finished' }));
    expect(screen.getByTestId('table')).toHaveTextContent('No contests match these filters');
  });

  it('reports a failed load', () => {
    feed({ error: { status: 500, message: 'Feed down' } });
    renderWithProviders(<ContestsBrowser />);
    expect(screen.getByText('Feed down')).toBeInTheDocument();
  });

  it('loads the next page while one is coming', () => {
    feed({ hasNextPage: true, isFetchingNextPage: true });
    renderWithProviders(<ContestsBrowser />);
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });
});

describe('ContestsBrowserSkeleton', () => {
  it('renders placeholders', () => {
    renderWithProviders(<ContestsBrowserSkeleton />);
    expect(screen.getByText('Contests')).toBeInTheDocument();
  });
});
