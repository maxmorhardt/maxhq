import { ErrorOutline, Home, Refresh } from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

export function ErrorFallback() {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <ErrorOutline sx={{ fontSize: 64, color: '#ff6b6b' }} />
        </Box>
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '4rem', md: '6rem' },
            mb: 2,
            color: theme.palette.primary.main,
          }}
        >
          Oops
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontWeight: 700, mb: 4, fontSize: { xs: '1.5rem', md: '2.5rem' }, color: 'white' }}
        >
          Something Went Wrong
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            opacity: 0.9,
            fontWeight: 300,
            maxWidth: 600,
            mx: 'auto',
            mb: 6,
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred. Please try refreshing the page.
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Home />}
            onClick={() => {
              window.location.href = '/';
            }}
          >
            Go Home
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
