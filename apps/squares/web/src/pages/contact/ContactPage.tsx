import { Email, LocationOn, Phone } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import FormCard from '../../components/common/FormCard';
import ContactForm from '../../components/contact/ContactForm';

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

export default function ContactPage() {
  const handleFormSubmit = (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    console.log('Form submitted:', formData);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'white',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: { xs: '2rem', sm: '3rem' },
          }}
        >
          Contact Us
        </Typography>
        <Typography
          variant="h6"
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 6 }}>
        <ContactForm onSubmit={handleFormSubmit} />

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
