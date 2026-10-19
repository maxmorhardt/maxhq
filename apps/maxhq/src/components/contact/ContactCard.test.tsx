import GitHubIcon from '@mui/icons-material/GitHub';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContactCard, { type ContactChannel } from './ContactCard';
import { renderWithProviders } from '../../testUtils';

const channel: ContactChannel = {
  label: 'GitHub',
  href: 'https://github.com/maxmorhardt',
  icon: <GitHubIcon />,
  handle: '@maxmorhardt',
};

describe('ContactCard', () => {
  it('renders the channel label and handle', () => {
    renderWithProviders(<ContactCard channel={channel} />);

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('@maxmorhardt')).toBeInTheDocument();
  });

  it('links out to the channel in a new tab', () => {
    renderWithProviders(<ContactCard channel={channel} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/maxmorhardt');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('accepts a stagger delay', () => {
    const { container } = renderWithProviders(<ContactCard channel={channel} delay={2} />);

    expect(container.firstElementChild).toHaveStyle({ transitionDelay: '200ms' });
  });
});
