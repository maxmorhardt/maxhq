import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContestsTableSkeleton from './ContestsTableSkeleton';

describe('ContestsTableSkeleton', () => {
  it('renders two placeholder rows by default', () => {
    render(<ContestsTableSkeleton />);
    expect(screen.getAllByTestId('contest-row-skeleton')).toHaveLength(2);
  });

  it('renders the requested number of rows', () => {
    render(<ContestsTableSkeleton rowCount={4} />);
    expect(screen.getAllByTestId('contest-row-skeleton')).toHaveLength(4);
  });
});
