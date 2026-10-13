import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HeroTerminal from './HeroTerminal';
import { renderWithProviders } from '../../testUtils';

// lets a test decide which media queries report a match
function setMedia(matcher: (query: string) => boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: matcher(query),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList
  );
}

const reducedMotion = (query: string) => query.includes('prefers-reduced-motion');

afterEach(() => {
  setMedia(reducedMotion);
});

// setupTests forces reduced motion, so the boot script prints at once

const type = async (user: ReturnType<typeof userEvent.setup>, command: string) => {
  const input = screen.getByRole('textbox', { name: 'Terminal command input' });
  await user.click(input);
  await user.type(input, `${command}{Enter}`);
};

describe('HeroTerminal', () => {
  it('prints the boot script and enables the prompt', async () => {
    renderWithProviders(<HeroTerminal />);

    expect(
      await screen.findByText('Max Morhardt, software engineer @ Fidelity')
    ).toBeInTheDocument();
    expect(screen.getByText('kubectl get httproute -A')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Terminal command input' })).toBeInTheDocument();
  });

  it('renders the launchpad menu with internal and external destinations', async () => {
    renderWithProviders(<HeroTerminal />);

    const menu = await screen.findByRole('navigation', { name: 'Explore the site' });

    expect(within(menu).getByRole('link', { name: /projects/ })).toHaveAttribute(
      'href',
      '/projects'
    );
    expect(within(menu).getByRole('link', { name: /github/ })).toHaveAttribute(
      'href',
      'https://github.com/maxmorhardt'
    );
  });

  it('answers the help command', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, 'help');

    expect(await screen.findByText('available commands:')).toBeInTheDocument();
  });

  it('answers the name command', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, 'name');

    expect(await screen.findByText('Max Morhardt')).toBeInTheDocument();
  });

  it('reports unknown commands', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, 'sudo rm -rf /');

    expect(
      await screen.findByText("command not found: sudo rm -rf / (try 'help')")
    ).toBeInTheDocument();
  });

  it('clears the screen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    expect(
      await screen.findByText('Max Morhardt, software engineer @ Fidelity')
    ).toBeInTheDocument();

    await type(user, 'clear');

    expect(
      screen.queryByText('Max Morhardt, software engineer @ Fidelity')
    ).not.toBeInTheDocument();
  });

  it('prints a fresh menu for ls', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, 'ls');

    expect(await screen.findAllByRole('navigation', { name: 'Explore the site' })).toHaveLength(2);
  });

  it('opens external destinations in a new window', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    vi.stubGlobal('open', open);

    renderWithProviders(<HeroTerminal />);

    await type(user, 'github');

    expect(open).toHaveBeenCalledWith('https://github.com/maxmorhardt', '_blank', 'noopener');
    vi.unstubAllGlobals();
  });

  it('answers the whoami, stack, email, and social commands', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, 'whoami');
    await type(user, 'stack');
    await type(user, 'email');
    await type(user, 'social');

    // whoami echoes the boot line, so it now appears twice
    expect(await screen.findAllByText('Max Morhardt, software engineer @ Fidelity')).toHaveLength(
      2
    );
    expect(screen.getAllByText(/spring boot · gin · gorm · jpa/).length).toBeGreaterThan(1);
    expect(screen.getAllByRole('link', { name: 'max@maxstash.io' }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'https://github.com/maxmorhardt' }).length
    ).toBeGreaterThan(0);
  });

  it('treats ? as help and ignores an empty command', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, '?');
    expect(await screen.findByText('available commands:')).toBeInTheDocument();

    const before = screen.getAllByText(/~ \$/).length;
    const input = screen.getByRole('textbox', { name: 'Terminal command input' });
    await user.click(input);
    await user.keyboard('{Enter}');

    // an empty prompt with a menu present activates the cursor rather than erroring
    expect(screen.getAllByText(/~ \$/).length).toBeGreaterThanOrEqual(before);
  });

  it('navigates internally when a route command is run', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    await type(user, 'projects');

    expect(await screen.findByText('> cd /projects')).toBeInTheDocument();
  });

  it('wraps the launchpad cursor backwards from the first item', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    const input = await screen.findByRole('textbox', { name: 'Terminal command input' });
    await user.click(input);
    await user.keyboard('{ArrowUp}');

    const menu = screen.getByRole('navigation', { name: 'Explore the site' });
    expect(within(menu).getByRole('link', { name: /linkedin/ })).toHaveTextContent('❯');
  });

  it('types the boot script out character by character when motion is allowed', async () => {
    setMedia(() => false);
    vi.useFakeTimers();

    renderWithProviders(<HeroTerminal />);

    // drain the chained typing timers
    await act(() => vi.runAllTimersAsync());

    expect(screen.getByText('Max Morhardt, software engineer @ Fidelity')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Explore the site' })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('uses the condensed stack on narrow screens', async () => {
    setMedia((query) => reducedMotion(query) || query.includes('max-width: 880px'));

    renderWithProviders(<HeroTerminal />);

    expect(await screen.findByText('java · ts · go · py · sql')).toBeInTheDocument();
  });

  it('moves the launchpad cursor with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeroTerminal />);

    const input = await screen.findByRole('textbox', { name: 'Terminal command input' });
    await user.click(input);

    const menu = screen.getByRole('navigation', { name: 'Explore the site' });

    // the cursor marker sits on the first item until an arrow key moves it
    expect(within(menu).getByRole('link', { name: /projects/ })).toHaveTextContent('❯');

    await user.keyboard('{ArrowDown}');

    expect(within(menu).getByRole('link', { name: /apps/ })).toHaveTextContent('❯');
  });
});
