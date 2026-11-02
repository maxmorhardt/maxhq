import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import PrintableSquaresPage from './PrintableSquaresPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('PrintableSquaresPage', () => {
  it('offers a board to print and the online version beside it', () => {
    mockAuth();
    renderWithProviders(<PrintableSquaresPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Printable Football Squares' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print Board' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start a free board/i })).toBeInTheDocument();
  });
});
