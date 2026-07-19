import { Email, LocationOn, Phone } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import FormCard from '../../components/common/FormCard';
import ContactForm from '../../components/contact/ContactForm';
import { submitContactForm } from '../../service/contestService';
import { useToast } from '../../hooks/useToast';

const contactMethods = [
  {
    icon: <Email sx={{ color: 'primary.dark', mr: 2 }} />,
    title: 'Email',
    details: 'support@maxstash.io',
  },
  {
    icon: <Phone sx={{ color: 'primary.dark', mr: 2 }} />,
    title: 'Phone',
    details: 'Available via email only',
  },
  {
    icon: <LocationOn sx={{ color: 'primary.dark', mr: 2 }} />,
    title: 'Response Time',
    details: 'We typically respond within a week',
  },
];

export default function ContactPage() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
    turnstileToken: string;
  }) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitContactForm(formData);
      showToast(response.message, 'success');
    } catch (error) {
      showToast('Failed to submit contact form. Please try again.', 'error');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3, mb: { xs: 4, sm: 4, md: 2 } }}>
      <Helmet>
        <title>Contact Us – Squares</title>
        <meta
          name="description"
          content="Get in touch with the Squares team. We’re here to help with your football squares questions."
        />
        <link rel="canonical" href="https://squares.maxstash.io/contact" />
      </Helmet>
      {/* page header with title and description */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'white',
            backgroundClip: 'text',
            fontSize: '2.5rem',
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
          Have a question or need help? We'd love to hear from you
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
