import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Home, HelpOutlineOutlined, LinkOff } from '@mui/icons-material';
import ErrorState, { type ErrorStateProps } from './ErrorState';

const theme = createTheme();

const baseProps: ErrorStateProps = {
  icon: LinkOff,
  label: '404',
  title: 'Page Not Found',
  description: 'That page does not exist.',
  actions: [{ label: 'Go Home', onClick: vi.fn(), icon: Home }],
};

function renderComponent(props: Partial<ErrorStateProps> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ErrorState {...baseProps} {...props} />
    </ThemeProvider>
  );
}

describe('ErrorState', () => {
  it('renders the label, title and description', () => {
    renderComponent();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('That page does not exist.')).toBeInTheDocument();
  });

  it('calls the action handler when its button is clicked', () => {
    const onClick = vi.fn();
    renderComponent({ actions: [{ label: 'Go Home', onClick }] });
    fireEvent.click(screen.getByRole('button', { name: /go home/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders every action provided', () => {
    renderComponent({
      actions: [
        { label: 'Go Home', onClick: vi.fn() },
        { label: 'My Contests', onClick: vi.fn() },
      ],
    });
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my contests/i })).toBeInTheDocument();
  });

  it('renders hints and the hint heading when hints are given', () => {
    renderComponent({
      hints: [{ icon: HelpOutlineOutlined, text: 'Try checking the URL.' }],
    });
    expect(screen.getByText('What you can do')).toBeInTheDocument();
    expect(screen.getByText('Try checking the URL.')).toBeInTheDocument();
  });

  it('omits the hint section when no hints are given', () => {
    renderComponent();
    expect(screen.queryByText('What you can do')).not.toBeInTheDocument();
  });

  it('renders children', () => {
    renderComponent({ children: <div data-testid="child">dialog</div> });
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
