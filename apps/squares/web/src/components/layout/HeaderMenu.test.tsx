import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import HeaderMenu from './HeaderMenu';

const theme = createTheme();

const mockPages = [
  { name: 'Contests', icon: <span />, navigate: '/contests' },
  { name: 'Learn More', icon: <span />, navigate: '/learn-more' },
  { name: 'Contact', icon: <span />, navigate: '/contact' },
];

const mockCloseNavMenu = vi.fn();

function renderMenu(overrides?: { anchorElNav?: HTMLElement | null }) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <HeaderMenu
          handleOpenNavMenu={vi.fn()}
          handleCloseNavMenu={mockCloseNavMenu}
          anchorElNav={overrides?.anchorElNav ?? null}
          pages={mockPages}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('HeaderMenu', () => {
  beforeEach(() => {
    mockCloseNavMenu.mockClear();
  });

  it('renders the hamburger menu button', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('does not render sign-in items (sign-in lives in the header)', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in with GitHub')).not.toBeInTheDocument();
    document.body.removeChild(anchorEl);
  });

  it('renders every page it is given', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    for (const page of mockPages) {
      expect(screen.getByText(page.name)).toBeInTheDocument();
    }
    document.body.removeChild(anchorEl);
  });

  it('renders menu items as prefetching links and closes the menu on click', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    const learnMore = screen.getByRole('menuitem', { name: 'Learn More' });
    expect(learnMore).toHaveAttribute('href', '/learn-more');

    fireEvent.click(learnMore);
    expect(mockCloseNavMenu).toHaveBeenCalled();
    document.body.removeChild(anchorEl);
  });
});
