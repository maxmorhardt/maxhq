import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import ContactForm from './ContactForm';

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onBeforeInteractive,
  }: {
    onSuccess: (token: string) => void;
    onBeforeInteractive: () => void;
  }) => (
    <button
      data-testid="complete-captcha"
      onClick={() => {
        onBeforeInteractive?.();
        onSuccess('mock-token');
      }}
    >
      Complete Captcha
    </button>
  ),
}));

const theme = createTheme();

function renderForm(props?: { onSubmit?: () => Promise<void>; isSubmitting?: boolean }) {
  const onSubmit = props?.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const isSubmitting = props?.isSubmitting ?? false;
  return render(
    <ThemeProvider theme={theme}>
      <ContactForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
    </ThemeProvider>
  );
}

describe('ContactForm', () => {
  it('renders the form title', () => {
    renderForm();
    expect(screen.getByText('Send us a message')).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('disables the submit button when no turnstile token', () => {
    renderForm();
    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).toBeDisabled();
  });

  it('enables the submit button after captcha is completed', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('complete-captcha'));
    expect(screen.getByRole('button', { name: /send message/i })).not.toBeDisabled();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { name: 'name', value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { name: 'email', value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { name: 'subject', value: 'Test subject' },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { name: 'message', value: 'Hello world' },
    });
    fireEvent.click(screen.getByTestId('complete-captcha'));
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'Test subject',
        message: 'Hello world',
        turnstileToken: 'mock-token',
      });
    });
  });

  it('disables the submit button when isSubmitting is true', () => {
    renderForm({ isSubmitting: true });
    fireEvent.click(screen.getByTestId('complete-captcha'));
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });
});
