import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageHeader from './PageHeader';
import { renderWithProviders } from '../../testUtils';

describe('PageHeader', () => {
  it('renders the title as the page heading', () => {
    renderWithProviders(<PageHeader title="Projects" lede="What I build." />);

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
  });

  it('renders the lede', () => {
    renderWithProviders(<PageHeader title="About" lede="Who I am." width="md" />);

    expect(screen.getByText('Who I am.')).toBeInTheDocument();
  });
});
