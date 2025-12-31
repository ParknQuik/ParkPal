import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

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
            color="warning"
            sx={{ fontSize: 100, mb: 2 }}
          />

          <Typography variant="h1" gutterBottom sx={{ fontSize: '4rem', fontWeight: 'bold' }}>
            404
          </Typography>

          <Typography variant="h4" gutterBottom>
            Page Not Found
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sorry, the page you're looking for doesn't exist or has been moved.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>

            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;
