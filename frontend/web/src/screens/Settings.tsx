import { Box, Button, Container, FormControl, Link as MuiLink, Paper, Select, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode, type ThemePreference } from '../theme/ThemeModeProvider';

export default function Settings() {
  const { user } = useAuth();
  const { preference, setPreference } = useThemeMode();
  const destination = user?.role === 'admin'
    ? { to: '/admin-dashboard', label: 'Admin dashboard' }
    : user?.canHost || user?.role === 'host'
      ? { to: '/host-dashboard', label: 'My listings' }
      : { to: '/list-slot', label: 'List a space' };

  return <Container maxWidth="md" component="main" sx={{ py: { xs: 4, md: 7 } }}>
    <Box sx={{ mb: { xs: 3, md: 4 } }}>
      <Typography variant="h3" component="h1" gutterBottom>Settings</Typography>
      <Typography color="text.secondary">Your appearance, privacy, and account in one place.</Typography>
    </Box>

    <Stack spacing={2.5}>
      <Paper variant="outlined" component="section" aria-labelledby="appearance-heading" sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography id="appearance-heading" variant="h6" component="h2">Appearance</Typography>
          <Typography color="text.secondary" variant="body2">System follows your device. Your choice is saved in this browser.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150, alignSelf: { sm: 'center' } }}>
          <Select native value={preference} onChange={(event) => setPreference(event.target.value as ThemePreference)} inputProps={{ 'aria-label': 'Color theme' }}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </FormControl>
      </Paper>

      <Paper variant="outlined" component="section" aria-labelledby="privacy-heading" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography id="privacy-heading" variant="h6" component="h2" gutterBottom>Privacy</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Review our policies and choose whether to allow optional performance analytics.</Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center">
          <MuiLink component={Link} to="/privacy">Privacy policy</MuiLink>
          <MuiLink component={Link} to="/terms">Terms of service</MuiLink>
          <Button variant="outlined" size="small" onClick={() => window.dispatchEvent(new Event('parkpal:privacy-choices'))}>Manage privacy choices</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" component="section" aria-labelledby="account-heading" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography id="account-heading" variant="h6" component="h2" gutterBottom>Account</Typography>
        {user ? <Stack direction="row" flexWrap="wrap" gap={2}>
          <MuiLink component={Link} to="/profile">Profile</MuiLink>
          <MuiLink component={Link} to="/bookings">My bookings</MuiLink>
          <MuiLink component={Link} to="/vehicles">My vehicles</MuiLink>
          <MuiLink component={Link} to={destination.to}>{destination.label}</MuiLink>
        </Stack> : <>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>Sign in to manage your bookings, vehicles, and listings.</Typography>
          <Button component={Link} to="/login" variant="contained">Sign in</Button>
        </>}
      </Paper>
    </Stack>
  </Container>;
}
