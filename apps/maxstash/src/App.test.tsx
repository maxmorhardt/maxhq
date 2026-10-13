import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { renderWithProviders } from './testUtils';

describe('App', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('renders the header and footer chrome around the routed content', () => {
    renderWithProviders(<App />);

    expect(screen.getByRole('link', { name: 'maxstash home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument();
  });

  it('renders a main landmark for the routed page', () => {
    renderWithProviders(<App />);

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
