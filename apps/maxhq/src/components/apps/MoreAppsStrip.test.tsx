import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MoreAppsStrip from './MoreAppsStrip';
import { renderWithProviders } from '../../testUtils';

describe('MoreAppsStrip', () => {
  it('says more apps are coming on the same account', () => {
    renderWithProviders(<MoreAppsStrip />);

    expect(screen.getByRole('heading', { name: 'More apps on the way' })).toBeInTheDocument();
    expect(screen.getByText(/same maxhq account/)).toBeInTheDocument();
  });
});
