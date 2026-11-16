import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TermsOfServicePage from './TermsOfServicePage';
import { renderWithProviders } from '../testUtils';

describe('TermsOfServicePage', () => {
  it('renders the terms heading and date', () => {
    renderWithProviders(<TermsOfServicePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText('Last updated: November 15, 2026')).toBeInTheDocument();
  });

  it('renders every numbered section', () => {
    renderWithProviders(<TermsOfServicePage />);

    expect(screen.getByRole('heading', { name: '1. Acceptance of Terms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '14. Contact Information' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(14);
  });
});
