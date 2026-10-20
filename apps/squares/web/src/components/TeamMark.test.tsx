import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TeamMark from './TeamMark';

describe('TeamMark', () => {
  it('shows the team abbreviation on its color', () => {
    render(<TeamMark abbr="kc" />);

    expect(screen.getByText('KC')).toHaveStyle({ backgroundColor: '#E31837' });
  });

  it('falls back to letters from the name', () => {
    render(<TeamMark name="Lions" size={24} />);

    expect(screen.getByText('LIO')).toBeInTheDocument();
  });
});
