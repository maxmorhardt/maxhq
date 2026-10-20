import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhoneShowcase from './PhoneShowcase';
import { renderWithProviders } from '../../testUtils';

describe('PhoneShowcase', () => {
  it('calls out the winner, live scores, and your squares', () => {
    renderWithProviders(<PhoneShowcase />);

    for (const title of ['Q3 winner', 'Live', 'Your squares']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('shows the board inside the phone', () => {
    renderWithProviders(<PhoneShowcase />);

    expect(screen.getByText('MM')).toBeInTheDocument();
    expect(screen.getByText('END Q3')).toBeInTheDocument();
  });
});
