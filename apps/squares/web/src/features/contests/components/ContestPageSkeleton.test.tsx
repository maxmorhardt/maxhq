import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ContestPageSkeleton from './ContestPageSkeleton';

describe('ContestPageSkeleton', () => {
  it('renders skeleton placeholders', () => {
    const { container } = render(<ContestPageSkeleton />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders a placeholder for the header, each quarter, the board, and both panels', () => {
    const { container } = render(<ContestPageSkeleton />);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(8);
  });

  it('renders no text content', () => {
    const { container } = render(<ContestPageSkeleton />);
    expect(container.textContent).toBe('');
  });
});
