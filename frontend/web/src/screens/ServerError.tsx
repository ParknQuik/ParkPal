import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ServerError = () => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
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
            sx={{ fontSize: 100, mb: 2 }}
          />

          <Typography variant="h1" gutterBottom sx={{ fontSize: '4rem', fontWeight: 'bold' }}>
            500
          </Typography>

          <Typography variant="h4" gutterBottom>
            Internal Server Error
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            We're experiencing technical difficulties. Our team has been notified and is working to fix the issue.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Reload Page
            </Button>

            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            If the problem persists, please contact support.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default ServerError;
