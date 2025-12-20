import { Send } from '@mui/icons-material';
import { Box, Button, Paper, TextField, Typography, useTheme } from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';

interface ContactFormProps {
  onSubmit?: (formData: { name: string; email: string; subject: string; message: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ContactForm({ onSubmit, isSubmitting = false }: ContactFormProps) {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit(formData);
      // Clear form on successful submission
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
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
      <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 600 }}>
        Send us a message
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            fullWidth
            label="Your Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />

          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </Box>

        <TextField
          fullWidth
          label="Subject"
          name="subject"
          value={formData.subject}
          onChange={handleInputChange}
          required
        />

        <TextField
          fullWidth
          label="Message"
          name="message"
          multiline
          rows={6}
          value={formData.message}
          onChange={handleInputChange}
          required
        />

        <Button
          type="submit"
          variant="contained"
          startIcon={<Send />}
          disabled={isSubmitting}
          sx={{
            alignSelf: 'flex-start',
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </Box>
    </Paper>
  );
}
