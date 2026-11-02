import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import SignInPrompt from './SignInPrompt';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('SignInPrompt', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('explains why to sign in and offers the providers inline', () => {
    mockAuth();
    renderWithProviders(<SignInPrompt title="Sign in to play" description="It's free." />);

    expect(screen.getByRole('heading', { name: 'Sign in to play' })).toBeInTheDocument();
    expect(screen.getByText("It's free.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('brings the visitor back to the page they were on', () => {
    mockAuth();
    window.history.replaceState(null, '', '/contests/create');
    renderWithProviders(<SignInPrompt title="Sign in" description="Free." />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with GitHub' }));

    expect(sessionStorage.getItem('auth_redirect_path')).toBe('/contests/create');
    window.history.replaceState(null, '', '/');
  });
});
