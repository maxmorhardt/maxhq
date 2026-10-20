import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Send } from '@mui/icons-material';
import { Box, Button, Paper, Skeleton, TextField, Typography } from '@mui/material';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { fonts } from '../../../app/theme';
import type { ContactRequest } from '../../../types/contact';
import { isProduction } from '../../../utils/environment';
import { stripDangerousChars } from '../../../utils/sanitize';

const MESSAGE_MAX_LENGTH = 2000;

interface Props {
  // resolves when the message is sent and rejects when it is not, so the form keeps its input
  onSubmit: (request: ContactRequest) => Promise<void>;
  isSubmitting: boolean;
}

export default function ContactForm({ onSubmit, isSubmitting }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const siteKey = isProduction() ? '0x4AAAAAACKD7d5JYPJqlXPI' : '1x00000000000000000000AA';

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: stripDangerousChars(value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({ ...formData, turnstileToken });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } catch {
      // form data preserved on error
    }
  };

  return (
    <Paper
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '20px',
        p: { xs: 2.5, sm: 4 },
      }}
    >
      {/* form title */}
      <Typography
        component="h2"
        sx={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '1.9rem',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        Send us a message
      </Typography>
      <Typography sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        Questions, bugs, or ideas. Every message reaches a real person.
      </Typography>

      {/* contact form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {/* name and email row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Your Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </Box>

        {/* subject field */}
        <TextField
          fullWidth
          label="Subject"
          name="subject"
          value={formData.subject}
          onChange={handleInputChange}
          required
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />

        {/* message field */}
        <TextField
          fullWidth
          label="Message"
          name="message"
          multiline
          rows={6}
          value={formData.message}
          onChange={handleInputChange}
          required
          helperText={`${formData.message.length}/${MESSAGE_MAX_LENGTH}`}
          slotProps={{
            htmlInput: { maxLength: MESSAGE_MAX_LENGTH },
            formHelperText: { sx: { textAlign: 'right', mx: 0 } },
          }}
        />

        {/* turnstile verification */}
        <Box sx={{ position: 'relative', width: 300, height: 65 }}>
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            onBeforeInteractive={() => setTurnstileReady(true)}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setTurnstileReady(true);
            }}
          />
          {!turnstileReady && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <Skeleton variant="rectangular" width={300} height={65} sx={{ borderRadius: 1 }} />
            </Box>
          )}
        </Box>

        {/* submit button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<Send />}
          disabled={isSubmitting || !turnstileToken}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          Send Message
        </Button>
      </Box>
    </Paper>
  );
}
