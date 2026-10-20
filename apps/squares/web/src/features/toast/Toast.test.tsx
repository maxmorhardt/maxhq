import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Toast } from './Toast';

const theme = createTheme();

function renderToast(props?: Partial<React.ComponentProps<typeof Toast>>) {
  return render(
    <ThemeProvider theme={theme}>
      <Toast
        open={props?.open ?? true}
        message={props?.message ?? 'Test message'}
        severity={props?.severity ?? 'info'}
        onClose={props?.onClose ?? vi.fn()}
        autoHideDuration={props?.autoHideDuration}
      />
    </ThemeProvider>
  );
}

describe('Toast', () => {
  it('renders the message text when open', () => {
    renderToast({ message: 'Something happened' });
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('does not render the message when closed', () => {
    renderToast({ open: false, message: 'Hidden message' });
    expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
  });

  it('renders with error severity', () => {
    renderToast({ severity: 'error', message: 'Error occurred' });
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('renders with success severity', () => {
    renderToast({ severity: 'success', message: 'All good' });
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders with warning severity', () => {
    renderToast({ severity: 'warning', message: 'Watch out' });
    expect(screen.getByText('Watch out')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderToast({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
