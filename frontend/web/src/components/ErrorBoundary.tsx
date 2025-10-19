import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  resetOnError?: boolean;
  showContactSupport?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console and potentially to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send error to error reporting service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Optionally reload the page
    if (this.props.resetOnError) {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                maxWidth: 600,
              }}
            >
              <ErrorIcon
                color="error"
                sx={{ fontSize: 80, mb: 2 }}
              />

              <Typography variant="h4" gutterBottom color="error">
                Oops! Something went wrong
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We're sorry for the inconvenience. The application has encountered an unexpected error.
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    textAlign: 'left',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </Button>
              </Box>

              {this.props.showContactSupport && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
                  If this problem persists, please contact support.
                </Typography>
              )}
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.defaultProps = {
  resetOnError: false,
  showContactSupport: true,
};

export default ErrorBoundary;
