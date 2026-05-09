import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toastReducer } from '../../features/toast/toastSlice';
import ContactPage from './ContactPage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockSubmitContactForm = vi.fn();
vi.mock('../../service/contestService', () => ({
  submitContactForm: (...args: unknown[]) => mockSubmitContactForm(...args),
}));

const mockShowToast = vi.fn();
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Capture the onSubmit prop so tests can invoke it directly
let capturedOnSubmit:
  | ((data: {
      name: string;
      email: string;
      subject: string;
      message: string;
      turnstileToken: string;
    }) => Promise<void>)
  | null = null;

vi.mock('../../components/contact/ContactForm', () => ({
  default: ({
    onSubmit,
    isSubmitting,
  }: {
    onSubmit: (data: {
      name: string;
      email: string;
      subject: string;
      message: string;
      turnstileToken: string;
    }) => Promise<void>;
    isSubmitting: boolean;
  }) => {
    capturedOnSubmit = onSubmit;
    return (
      <div data-testid="contact-form" data-submitting={String(isSubmitting)}>
        Contact Form
      </div>
    );
  },
}));

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({ reducer: { toast: toastReducer } });
}

function renderPage() {
  capturedOnSubmit = null;
  return render(
    <Provider store={createTestStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ContactPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

const fakeFormData = {
  name: 'Alice',
  email: 'alice@example.com',
  subject: 'Hi',
  message: 'Hello',
  turnstileToken: 'token',
};

describe('ContactPage', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    mockSubmitContactForm.mockClear();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('renders contact method cards', () => {
    renderPage();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
  });

  it('renders the contact form', () => {
    renderPage();
    expect(screen.getByTestId('contact-form')).toBeInTheDocument();
  });

  it('renders the support email address', () => {
    renderPage();
    expect(screen.getByText('support@maxstash.io')).toBeInTheDocument();
  });

  it('shows a success toast when form submission succeeds', async () => {
    mockSubmitContactForm.mockResolvedValue({ message: 'Message sent!' });
    renderPage();
    await act(async () => {
      await capturedOnSubmit!(fakeFormData);
    });
    expect(mockShowToast).toHaveBeenCalledWith('Message sent!', 'success');
  });

  it('shows an error toast and rethrows when form submission fails', async () => {
    mockSubmitContactForm.mockRejectedValue(new Error('Network error'));
    renderPage();
    await expect(
      act(async () => {
        await capturedOnSubmit!(fakeFormData);
      })
    ).rejects.toThrow();
    expect(mockShowToast).toHaveBeenCalledWith(
      'Failed to submit contact form. Please try again.',
      'error'
    );
  });

  it('passes isSubmitting=false to the form initially', () => {
    renderPage();
    expect(screen.getByTestId('contact-form')).toHaveAttribute('data-submitting', 'false');
  });

  it('calls submitContactForm with the provided form data', async () => {
    mockSubmitContactForm.mockResolvedValue({ message: 'Sent!' });
    renderPage();
    await act(async () => {
      await capturedOnSubmit!(fakeFormData);
    });
    expect(mockSubmitContactForm).toHaveBeenCalledWith(fakeFormData);
  });
});
