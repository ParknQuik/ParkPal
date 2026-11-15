import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  FormControl,
  Select,
} from '@mui/material';
import { AccountCircle, Logout, Dashboard, CalendarMonth } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../theme/ThemeModeProvider';

export const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { preference, setPreference } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleDashboard = () => {
    handleClose();
    if (user?.role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/host-dashboard');
    }
  };

  const handleBookings = () => {
    handleClose();
    navigate('/bookings');
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar>
        <Button color="inherit" onClick={() => navigate(user ? '/search' : '/')} aria-label="ParknQuik home" sx={{ flexGrow: 1, justifyContent: 'flex-start', textTransform: 'none', fontSize: '1.22rem', fontWeight: 800, letterSpacing: '-.045em', '&:hover': { backgroundColor: 'transparent', boxShadow: 'none' } }}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, mr: 1.1, borderRadius: '10px 10px 10px 3px', bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 16, fontWeight: 900 }}>P</Box>
          <Box component="span">ParknQuik</Box>
        </Button>

        <FormControl size="small" sx={{ minWidth: { xs: 92, sm: 112 }, mr: { xs: 0.5, sm: 1 } }}>
          <Select
            native
            value={preference}
            onChange={(event) => setPreference(event.target.value as 'system' | 'light' | 'dark')}
            inputProps={{ 'aria-label': 'Color theme' }}
            sx={{ height: 40, borderRadius: 2, '& .MuiSelect-select': { py: 1, px: 1.25 }, '& fieldset': { borderColor: 'divider' } }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </FormControl>

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {user.name}
            </Typography>

            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {getInitials(user.name)}
              </Avatar>
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 1 }} />
                Profile
              </MenuItem>

              <MenuItem onClick={handleBookings}>
                <CalendarMonth sx={{ mr: 1 }} />
                My bookings
              </MenuItem>

              {user.role !== 'admin' && (
                <MenuItem onClick={handleDashboard}>
                  <Dashboard sx={{ mr: 1 }} />
                  My Listings
                </MenuItem>
              )}
              {user.role === 'admin' && (
                <MenuItem onClick={() => { handleClose(); navigate('/host-dashboard'); }}>
                  <Dashboard sx={{ mr: 1 }} />
                  My Listings
                </MenuItem>
              )}

              {user.role === 'admin' && (
                <MenuItem onClick={() => { handleClose(); navigate('/admin-dashboard/metrics'); }}>
                  Metrics &amp; health
                </MenuItem>
              )}

              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}

        {!user && (
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
