import { Turnstile } from '@marsidev/react-turnstile';
import { Send } from '@mui/icons-material';
import { Box, Button, Paper, Skeleton, TextField, Typography, useTheme } from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { stripDangerousChars } from '../../utils/sanitize';

interface ContactFormProps {
  onSubmit: (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
    turnstileToken: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export default function ContactForm({ onSubmit, isSubmitting }: ContactFormProps) {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const siteKey = import.meta.env.PROD ? '0x4AAAAAACKD7d5JYPJqlXPI' : '1x00000000000000000000AA';

  // update form data with new input value
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: stripDangerousChars(value) }));
  };

  // submit form data
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({ ...formData, turnstileToken });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      // form data preserved on error
    }
  };

  return (
    <Paper
      sx={{
        background: theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: 3,
        p: 4,
      }}
    >
      {/* form title */}
      <Typography variant="h5" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
        Send us a message
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
          rows={4}
          value={formData.message}
          onChange={handleInputChange}
          required
          slotProps={{ htmlInput: { maxLength: 2000 } }}
        />

        {/* turnstile verification */}
        <Box sx={{ position: 'relative', width: 300, height: 65 }}>
          <Turnstile
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
          startIcon={<Send />}
          disabled={isSubmitting || !turnstileToken}
          sx={{
            alignSelf: 'flex-start',
          }}
        >
          Send Message
        </Button>
      </Box>
    </Paper>
  );
}
