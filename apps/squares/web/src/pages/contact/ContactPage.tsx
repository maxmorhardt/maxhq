import { Email, LocationOn, Phone } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import { useState } from 'react';
import FormCard from '../../components/common/FormCard';
import ContactForm from '../../components/contact/ContactForm';
import { submitContactForm } from '../../service/contestService';
import { useToast } from '../../hooks/useToast';

const iconColor = '#667eea';

const contactMethods = [
  {
    icon: <Email sx={{ color: iconColor, mr: 2 }} />,
    title: 'Email',
    details: 'support@maxstash.io',
  },
  {
    icon: <Phone sx={{ color: iconColor, mr: 2 }} />,
    title: 'Phone',
    details: 'Available via email only',
  },
  {
    icon: <LocationOn sx={{ color: iconColor, mr: 2 }} />,
    title: 'Response Time',
    details: 'We typically respond within 24 hours',
  },
];

// contact page with form and contact method cards
export default function ContactPage() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // submit contact form and show success/error toast
  const handleFormSubmit = async (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitContactForm(formData);
      showToast(response.message, 'success');
    } catch (error) {
      console.log(error);
      showToast('Failed to submit contact form. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* page header with title and description */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'white',
            backgroundClip: 'text',
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          Contact Us
        </Typography>
        <Typography
          variant="body1"
          sx={{
            opacity: 0.8,
            maxWidth: 600,
            mx: 'auto',
            fontWeight: 400,
          }}
        >
          Have a question or need help? We'd love to hear from you. Send us a message and we'll
          respond as soon as possible.
        </Typography>
      </Box>

      {/* contact form and info cards side by side */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
        <ContactForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />

        {/* contact method cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {contactMethods.map((method) => (
            <FormCard
              key={method.title}
              icon={method.icon}
              title={method.title}
              details={method.details}
            />
          ))}
        </Box>
      </Box>
    </Container>
  );
}
