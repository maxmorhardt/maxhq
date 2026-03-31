import { Chat, Send } from '@mui/icons-material';
import { Box, IconButton, InputBase, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../types/contest';
import { stripDangerousChars } from '../../utils/sanitize';
import ContestSidebarCard from './ContestSidebarCard';

interface LiveChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  currentUser?: string;
  disabled?: boolean;
}

export default function LiveChat({
  messages,
  onSend,
  currentUser,
  disabled = false,
}: LiveChatProps) {
  const [message, setMessage] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ContestSidebarCard icon={<Chat />} title="Live Chat">
      {/* messages area */}
      <Box
        ref={chatRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.6,
          minHeight: 250,
          maxHeight: 250,
          overflowY: 'auto',
          pr: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
          },
        }}
      >
        {messages.length === 0 ? (
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.8rem',
              textAlign: 'center',
              py: 4,
            }}
          >
            No messages yet
          </Typography>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender === currentUser;
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.4)',
                    mb: 0.2,
                    px: 0.5,
                  }}
                >
                  {isOwn ? 'You' : msg.sender}
                </Typography>
                <Box
                  sx={{
                    background: isOwn ? 'rgba(102,126,234,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isOwn ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 1.5,
                    px: 1,
                    py: 0.5,
                    maxWidth: '85%',
                  }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '0.78rem',
                      lineHeight: 1.35,
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.message}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* message input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 1.5,
          p: 0.5,
          pl: 1.5,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <InputBase
          placeholder={disabled ? 'Sign in to chat' : 'Type a message...'}
          value={message}
          onChange={(e) => {
            const sanitized = stripDangerousChars(e.target.value);
            if (sanitized.length <= 255) {
              setMessage(sanitized);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          sx={{
            flex: 1,
            color: 'white',
            fontSize: '0.85rem',
            '& input::placeholder': {
              color: 'rgba(255,255,255,0.35)',
              opacity: 1,
            },
          }}
        />
        <IconButton
          size="small"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          sx={{ color: message.trim() && !disabled ? '#667eea' : 'rgba(255,255,255,0.3)' }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </ContestSidebarCard>
  );
}
