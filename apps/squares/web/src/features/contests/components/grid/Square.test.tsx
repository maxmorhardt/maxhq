import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import Square from './Square';

const theme = createTheme();

function renderSquare(props: Partial<Parameters<typeof Square>[0]> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <Square rowIndex={0} colIndex={0} squareData="" handleSquareClick={vi.fn()} {...props} />
    </ThemeProvider>
  );
}

describe('Square', () => {
  it('renders the square button', () => {
    renderSquare();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows square data text when filled', () => {
    renderSquare({ squareData: 'JD' });
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('calls handleSquareClick with row and col when clicked', () => {
    const handleSquareClick = vi.fn();
    renderSquare({ handleSquareClick, rowIndex: 2, colIndex: 3 });
    fireEvent.click(screen.getByRole('button'));
    expect(handleSquareClick).toHaveBeenCalledWith(2, 3);
  });

  it('shows x-axis label for squares in the first row', () => {
    renderSquare({ rowIndex: 0, colIndex: 0, xLabel: 7 });
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
