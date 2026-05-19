import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActiveContestControls from './ActiveContestControls';

describe('ActiveContestControls', () => {
  it('renders waiting message when squares are not all filled', () => {
    render(<ActiveContestControls allSquaresFilled={false} />);
    expect(screen.getByText(/waiting for all squares/i)).toBeInTheDocument();
  });

  it('renders nothing when all squares are filled', () => {
    const { container } = render(<ActiveContestControls allSquaresFilled={true} />);
    expect(container).toBeEmptyDOMElement();
  });
});
