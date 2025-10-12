import { Box, Container } from '@mui/material';
import ContactHeader from '../../components/contact/ContactHeader';
import ContactForm from '../../components/contact/ContactForm';
import ContactInfo from '../../components/contact/ContactInfo';

export default function ContactPage() {
  const handleFormSubmit = (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    // TODO: Implement form submission
    console.log('Form submitted:', formData);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <ContactHeader />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 6 }}>
        <ContactForm onSubmit={handleFormSubmit} />
        <ContactInfo />
      </Box>
    </Container>
  );
}
