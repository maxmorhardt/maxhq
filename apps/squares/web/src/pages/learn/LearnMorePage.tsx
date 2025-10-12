import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Sports,
  People,
  Timeline,
  Security,
  DeviceHub,
  ExpandMore,
} from '@mui/icons-material';

export default function LearnMorePage() {
  const features = [
    {
      icon: <Sports sx={{ color: '#667eea' }} />,
      title: 'Football Squares Made Easy',
      description: 'Create and manage football squares games with just a few clicks. Perfect for Super Bowl parties, playoff games, or any football event.',
    },
    {
      icon: <People sx={{ color: '#f093fb' }} />,
      title: 'Social & Collaborative',
      description: 'Share your contests with friends and family. Players can join with a simple link - no account creation required for participants.',
    },
    {
      icon: <Timeline sx={{ color: '#4facfe' }} />,
      title: 'Real-time Updates',
      description: 'See changes instantly as players fill out squares. Live synchronization ensures everyone sees the latest game state.',
    },
    {
      icon: <Security sx={{ color: '#43e97b' }} />,
      title: 'Secure & Reliable',
      description: 'Your contests are protected with modern security practices. Data is encrypted and safely stored in the cloud.',
    },
    {
      icon: <DeviceHub sx={{ color: '#ff9a8b' }} />,
      title: 'Cross-Platform',
      description: 'Works seamlessly on desktop, tablet, and mobile devices. Responsive design ensures a great experience everywhere.',
    },
  ];

  const faqs = [
    {
      question: 'What is a football squares game?',
      answer: 'Football squares (also called Super Bowl squares) is a popular betting pool game. Players buy squares in a 10x10 grid, and winners are determined based on the last digit of each team\'s score at the end of each quarter.',
    },
    {
      question: 'How do I create a contest?',
      answer: 'Simply click "Create Contest" on the home page, give your contest a name, optionally set team names, and share the link with your friends. They can then select their squares.',
    },
    {
      question: 'Do players need accounts?',
      answer: 'Only the contest creator needs an account. Participants can join and select squares using just the shared link - no registration required!',
    },
    {
      question: 'How are winners determined?',
      answer: 'Winners are typically determined by the last digit of each team\'s score. For example, if the score is Home: 14, Away: 7, the winning square would be at coordinates (4,7). You can customize the winning criteria for your contest.',
    },
    {
      question: 'Is it free to use?',
      answer: 'Yes! Creating and managing contests is completely free. There are no hidden fees or premium tiers - enjoy unlimited contests at no cost.',
    },
    {
      question: 'Can I use this for other sports?',
      answer: 'While designed for football, the platform can be adapted for any sport with scoring. The grid system works well for basketball, hockey, or any game with numerical scores.',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Learn More
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            maxWidth: 800,
            mx: 'auto',
            fontWeight: 400,
            lineHeight: 1.6,
          }}
        >
          Discover everything you need to know about creating and managing football squares games. 
          From basic concepts to advanced features, we've got you covered.
        </Typography>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ mb: 10 }}>
        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            mb: 6,
          }}
        >
          How Football Squares Work
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 4 }}>
          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  1
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                Create the Grid
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                Set up a 10x10 grid with 100 squares. Each square represents a potential winning combination.
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  2
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                Players Choose Squares
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                Participants select their squares by clicking on the grid. Each square can only be claimed once.
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  3
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
                Determine Winners
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                Winners are determined by the last digit of each team's score at the end of each quarter.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ mb: 10 }}>
        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            mb: 6,
          }}
        >
          Platform Features
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          {features.map((feature) => (
              <Card
                sx={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 3,
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 32px rgba(255,255,255,0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ mt: 0.5 }}>{feature.icon}</Box>
                    <Box>
                      <Typography variant="h6" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
                        {feature.title}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* FAQ Section */}
      <Box>
        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            mb: 6,
          }}
        >
          Frequently Asked Questions
        </Typography>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              sx={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px !important',
                mb: 2,
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  margin: '0 0 16px 0',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: 'white' }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    margin: '16px 0',
                  },
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Box>
    </Container>
  );
}