import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import SignInOptions from './SignInOptions';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

describe('SignInOptions', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('offers every provider and the terms', () => {
    mockAuth();
    renderWithProviders(<SignInOptions />);

    for (const provider of ['Google', 'Microsoft', 'GitHub']) {
      expect(screen.getByRole('button', { name: `Sign in with ${provider}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'terms of service' })).toHaveAttribute(
      'href',
      'https://maxhq.io/terms-of-service'
    );
  });

  it('signs in with the chosen provider and comes back to the given page', () => {
    const auth = mockAuth();
    const onSelect = vi.fn();
    renderWithProviders(<SignInOptions redirectPath="/contests/create" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Microsoft' }));

    expect(onSelect).toHaveBeenCalled();
    expect(auth.signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'microsoft' },
    });
    expect(sessionStorage.getItem('auth_redirect_path')).toBe('/contests/create');
  });
});
