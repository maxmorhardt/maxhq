import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ContestPageSkeleton from './ContestPageSkeleton';

describe('ContestPageSkeleton', () => {
  it('renders skeleton placeholders', () => {
    const { container } = render(<ContestPageSkeleton />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders a placeholder card for each section on desktop and mobile', () => {
    const { container } = render(<ContestPageSkeleton />);
    expect(container.querySelectorAll('.MuiPaper-root')).toHaveLength(9);
  });

  it('renders no text content', () => {
    const { container } = render(<ContestPageSkeleton />);
    expect(container.textContent).toBe('');
  });
});
