import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import AppLayout from './AppLayout';

const useAuthSession = vi.hoisted(() => vi.fn());
vi.mock('../auth/useAuthSession', () => ({ useAuthSession }));
vi.mock('../components/layout/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('../components/layout/Footer', () => ({ default: () => <div data-testid="footer" /> }));
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, Outlet: () => <div data-testid="outlet" /> };
});

describe('AppLayout', () => {
  it('frames the page and keeps the session alive', () => {
    renderWithProviders(<AppLayout />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('outlet'));
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(useAuthSession).toHaveBeenCalled();
  });
});
