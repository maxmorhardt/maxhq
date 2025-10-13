import { Send } from '@mui/icons-material';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useState } from 'react';

interface ContactFormProps {
  onSubmit?: (formData: { name: string; email: string; subject: string; message: string }) => void;
}

export default function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      '& fieldset': {
        borderColor: 'rgba(255,255,255,0.3)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255,255,255,0.5)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'rgba(255,255,255,0.7)',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255,255,255,0.7)',
    },
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
    console.log('Form submitted:', formData);
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <Paper
      sx={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
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
            sx={textFieldSx}
          />
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            sx={textFieldSx}
          />
        </Box>

        <TextField
          fullWidth
          label="Subject"
          name="subject"
          value={formData.subject}
          onChange={handleInputChange}
          required
          sx={textFieldSx}
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
          sx={textFieldSx}
        />

        <Button
          type="submit"
          variant="contained"
          startIcon={<Send />}
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
