import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Bolt } from '@mui/icons-material';
import LandingFeatureCard from './LandingFeatureCard';

describe('LandingFeatureCard', () => {
  it('renders the feature title', () => {
    render(
      <LandingFeatureCard
        gradient="primary"
        title="Real-time Updates"
        description="See changes instantly."
      />
    );
    expect(screen.getByText('Real-time Updates')).toBeInTheDocument();
  });

  it('renders the feature description', () => {
    render(
      <LandingFeatureCard
        gradient="cyan"
        title="Updates"
        description="Live sync for all players."
      />
    );
    expect(screen.getByText('Live sync for all players.')).toBeInTheDocument();
  });

  it('renders the icon when provided', () => {
    render(
      <LandingFeatureCard
        gradient="primary"
        title="Updates"
        description="Desc"
        icon={<Bolt data-testid="feature-icon" />}
      />
    );
    expect(screen.getByTestId('feature-icon')).toBeInTheDocument();
  });

  it('renders without an icon', () => {
    const { container } = render(
      <LandingFeatureCard gradient="mint" title="Free" description="No cost." />
    );
    expect(container).toBeInTheDocument();
  });
});
