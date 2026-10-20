import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders placeholders for the player card, four stats, the rank, and both settings rows', () => {
    render(<ProfileSkeleton />);
    expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('stat-skeleton')).toHaveLength(4);
    expect(screen.getAllByTestId('setting-skeleton')).toHaveLength(2);
  });
});
