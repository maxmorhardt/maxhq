import { ErrorOutlineOutlined, Home, Refresh, Schedule } from '@mui/icons-material';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorState from '../../components/common/ErrorState';

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
  return (
    <ErrorState
      icon={ErrorOutlineOutlined}
      label="Oops"
      title="Something Went Wrong"
      description="An unexpected error occurred. Please try refreshing the page."
      actions={[
        { label: 'Refresh Page', onClick: () => window.location.reload(), icon: Refresh },
        {
          label: 'Go Home',
          onClick: () => {
            window.location.href = '/';
          },
          icon: Home,
        },
      ]}
      hints={[
        {
          icon: Schedule,
          text: 'If refreshing does not help, the problem may be on our end. Try again in a few minutes.',
        },
      ]}
    />
  );
}
