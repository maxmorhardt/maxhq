import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AppHeader from './AppHeader';
import { renderWithProviders } from '../../testUtils';
import { COLOR_SCHEME_STORAGE_KEY } from '../../theme';

describe('AppHeader', () => {
  it('renders the brand link home', () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByRole('link', { name: 'maxstash home' })).toHaveAttribute('href', '/');
  });

  it('renders every nav destination', () => {
    renderWithProviders(<AppHeader />);

    const routes = [
      ['Home', '/'],
      ['Projects', '/projects'],
      ['Apps', '/apps'],
      ['About', '/about'],
      ['Contact', '/contact'],
    ];

    for (const [label, href] of routes) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('toggles the color scheme and swaps the button label', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    // defaults to dark, so the control offers light
    const toLight = await screen.findByRole('button', { name: 'Switch to light mode' });
    await user.click(toLight);

    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  // the key must match the one InitColorSchemeScript reads in root.tsx
  it('persists the choice under the app storage key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    await user.click(await screen.findByRole('button', { name: 'Switch to light mode' }));

    expect(localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light');
  });

  it('opens the mobile navigation menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />);

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(5);
  });

  it('marks the active route in the menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppHeader />, { route: '/about' });

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));

    const menu = await screen.findByRole('menu');
    const about = within(menu).getByRole('menuitem', { name: 'About' });
    expect(about).toHaveClass('Mui-selected');
  });
});
