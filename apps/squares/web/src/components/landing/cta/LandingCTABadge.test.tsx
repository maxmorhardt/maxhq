import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingCTABadge from './LandingCTABadge';

describe('LandingCTABadge', () => {
  it('renders the badge text', () => {
    render(<LandingCTABadge text="No credit card required" />);
    expect(screen.getByText('No credit card required')).toBeInTheDocument();
  });

  it('renders the checkmark icon', () => {
    const { container } = render(<LandingCTABadge text="Free to use" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
