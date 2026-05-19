import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LiveChat from './LiveChat';
import type { ChatMessage } from '../../../types/contest';

const theme = createTheme();

function renderChat(
  props: Partial<{
    messages: ChatMessage[];
    onSend: (m: string) => void;
    currentUser: string;
    disabled: boolean;
  }> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <LiveChat messages={[]} onSend={vi.fn()} {...props} />
    </ThemeProvider>
  );
}

const messages: ChatMessage[] = [
  { id: '1', sender: 'alice', message: 'Hello!', timestamp: '2025-01-01T12:00:00Z' },
  { id: '2', sender: 'bob', message: 'Good luck!', timestamp: '2025-01-01T12:01:00Z' },
];

describe('LiveChat', () => {
  it('renders the "Live Chat" heading', () => {
    renderChat();
    expect(screen.getByText('Live Chat')).toBeInTheDocument();
  });

  it('shows "No messages yet" when messages list is empty', () => {
    renderChat();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('renders chat messages', () => {
    renderChat({ messages });
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Good luck!')).toBeInTheDocument();
  });

  it('calls onSend when a message is typed and the send button is clicked', () => {
    const onSend = vi.fn();
    renderChat({ onSend });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hi there' } });
    fireEvent.click(screen.getByRole('button'));
    expect(onSend).toHaveBeenCalledWith('Hi there');
  });

  it('calls onSend when Enter is pressed in the input', () => {
    const onSend = vi.fn();
    renderChat({ onSend });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Enter message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('Enter message');
  });
});
