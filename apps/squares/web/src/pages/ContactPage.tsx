import { Email, HelpOutlined, Schedule } from '@mui/icons-material';
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
    icon: <Email />,
    title: 'Email',
    details: 'support@maxhq.io',
    href: 'mailto:support@maxhq.io',
  },
  {
    icon: <Schedule />,
    title: 'Response time',
    details: 'Usually within a week',
  },
  {
    icon: <HelpOutlined />,
    title: 'How it works',
    details: 'Rules, scoring, and FAQs',
    href: '/learn-more',
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
        align="left"
        title="Contact Us"
        subtitle="Have a question or need help? We'd love to hear from you."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.8fr) minmax(0, 1.2fr)' },
          gap: { xs: 4, md: 6 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {contactMethods.map((method) => (
            <ContactMethodCard
              key={method.title}
              icon={method.icon}
              title={method.title}
              details={method.details}
              href={method.href}
            />
          ))}
        </Box>

        <ContactForm onSubmit={handleSubmit} isSubmitting={isLoading} />
      </Box>
    </Container>
  );
}
