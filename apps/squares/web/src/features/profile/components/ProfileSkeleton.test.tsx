import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders placeholders for the header, four stats, the rank, and both settings rows', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(7);
    expect(container.querySelectorAll('.MuiSkeleton-circular')).toHaveLength(5);
  });
});
