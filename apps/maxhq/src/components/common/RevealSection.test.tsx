import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RevealSection from './RevealSection';
import { renderWithProviders } from '../../testUtils';

describe('RevealSection', () => {
  it('renders its children', () => {
    renderWithProviders(<RevealSection>content</RevealSection>);

    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders as the requested element', () => {
    renderWithProviders(
      <RevealSection component="p" data-testid="reveal">
        paragraph
      </RevealSection>
    );

    expect(screen.getByTestId('reveal').tagName).toBe('P');
  });

  // jsdom has no IntersectionObserver, so the hook reveals immediately
  it('marks itself visible once revealed', () => {
    renderWithProviders(<RevealSection data-testid="reveal">content</RevealSection>);

    expect(screen.getByTestId('reveal')).toHaveAttribute('data-visible', 'true');
  });

  it('accepts sx as an array', () => {
    renderWithProviders(
      <RevealSection data-testid="reveal" sx={[{ marginTop: '7px' }, { paddingTop: '9px' }]}>
        content
      </RevealSection>
    );

    expect(screen.getByTestId('reveal')).toHaveStyle({ marginTop: '7px', paddingTop: '9px' });
  });

  it('offsets the transition for a stagger delay', () => {
    renderWithProviders(
      <RevealSection data-testid="reveal" delay={3}>
        content
      </RevealSection>
    );

    expect(screen.getByTestId('reveal')).toHaveStyle({ transitionDelay: '300ms' });
  });

  it('applies caller styles alongside its own', () => {
    renderWithProviders(
      <RevealSection data-testid="reveal" sx={{ marginTop: '11px' }}>
        content
      </RevealSection>
    );

    expect(screen.getByTestId('reveal')).toHaveStyle({ marginTop: '11px' });
  });
});
