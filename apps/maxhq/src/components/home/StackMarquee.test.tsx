import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StackMarquee from './StackMarquee';
import { renderWithProviders } from '../../testUtils';

describe('StackMarquee', () => {
  it('renders both rows of the stack', () => {
    renderWithProviders(<StackMarquee />);

    const languages = screen.getByRole('list', { name: 'Languages and frameworks' });
    const platforms = screen.getByRole('list', { name: 'Platforms and operations' });

    expect(within(languages).getAllByText('Spring Boot')[0]).toBeInTheDocument();
    expect(within(platforms).getAllByText('Kubernetes')[0]).toBeInTheDocument();
  });

  it('hides the looping copy from assistive tech', () => {
    renderWithProviders(<StackMarquee />);

    const platforms = screen.getByRole('list', { name: 'Platforms and operations' });

    const copies = within(platforms).getAllByText('Kubernetes');
    expect(copies).toHaveLength(2);
    expect(copies.filter((copy) => copy.getAttribute('aria-hidden') === 'true')).toHaveLength(1);
  });
});
