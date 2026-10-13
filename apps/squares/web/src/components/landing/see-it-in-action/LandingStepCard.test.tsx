import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingStepCard from './LandingStepCard';

const baseProps = {
  step: 1,
  title: 'Game Reaches End of Quarter',
  gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  gradientLight: 'linear-gradient(135deg, rgba(255,107,107,0.05) 0%, rgba(255,142,83,0.05) 100%)',
  borderColor: '#FF6B6B',
  shadowColor: 'rgba(255, 107, 107, 0.12)',
};

describe('LandingStepCard', () => {
  it('renders the step number', () => {
    render(<LandingStepCard {...baseProps}>Some content</LandingStepCard>);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<LandingStepCard {...baseProps}>Some content</LandingStepCard>);
    expect(screen.getByText('Game Reaches End of Quarter')).toBeInTheDocument();
  });

  it('renders its children', () => {
    render(
      <LandingStepCard {...baseProps}>
        <span data-testid="child">Child content</span>
      </LandingStepCard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders with a different step number', () => {
    render(
      <LandingStepCard {...baseProps} step={3} title="Determine the Winner">
        Details
      </LandingStepCard>
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Determine the Winner')).toBeInTheDocument();
  });
});
