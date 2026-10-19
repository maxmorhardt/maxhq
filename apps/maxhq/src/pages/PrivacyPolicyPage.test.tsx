import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import { renderWithProviders } from '../testUtils';

describe('PrivacyPolicyPage', () => {
  it('renders the policy heading and date', () => {
    renderWithProviders(<PrivacyPolicyPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Last updated: July 12, 2026')).toBeInTheDocument();
  });

  it('renders every numbered section', () => {
    renderWithProviders(<PrivacyPolicyPage />);

    expect(screen.getByRole('heading', { name: '1. Introduction' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10. Contact Us' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(10);
  });
});
