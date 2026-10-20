import { Email, LocationOn, Phone } from '@mui/icons-material';
import { Box, Container } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import PageTitle from '../components/PageTitle';
import { useSubmitContactMutation } from '../features/contact/api';
import ContactForm from '../features/contact/components/ContactForm';
import ContactMethodCard from '../features/contact/components/ContactMethodCard';
import { useToast } from '../features/toast/useToast';
import type { ContactRequest } from '../types/contact';

const contactMethods = [
  {
    icon: <Email sx={{ color: 'primary.dark', mr: 2 }} />,
    title: 'Email',
    details: 'support@maxhq.io',
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
  const [submitContact, { isLoading }] = useSubmitContactMutation();

  const handleSubmit = async (request: ContactRequest) => {
    try {
      const response = await submitContact(request).unwrap();
      showToast(response.message, 'success');
    } catch (err) {
      showToast('Failed to submit contact form. Please try again.', 'error');
      throw err;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, mb: { xs: 4, sm: 4, md: 2 } }}>
      <Helmet>
        <title>Contact Us – Squares</title>
        <meta
          name="description"
          content="Get in touch with the Squares team. We’re here to help with your football squares questions."
        />
        <link rel="canonical" href="https://squares.maxhq.io/contact" />
      </Helmet>

      <PageTitle
        title="Contact Us"
        subtitle="Have a question or need help? We'd love to hear from you"
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
        <ContactForm onSubmit={handleSubmit} isSubmitting={isLoading} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {contactMethods.map((method) => (
            <ContactMethodCard
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
