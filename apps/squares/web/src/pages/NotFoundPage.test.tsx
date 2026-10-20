import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import NotFoundPage from './NotFoundPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('NotFoundPage', () => {
  it('renders the not found view', () => {
    mockAuth();
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });
});
