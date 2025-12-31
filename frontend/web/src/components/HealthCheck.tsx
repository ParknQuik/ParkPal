import { useEffect, useState } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import api from '../api';

interface HealthCheckProps {
  checkInterval?: number; // in milliseconds
  showNotifications?: boolean;
}

const HealthCheck: React.FC<HealthCheckProps> = ({
  checkInterval = 60000, // Default: 1 minute
  showNotifications = true
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkHealth = async () => {
      try {
        // Attempt to ping the health endpoint
        await api.get('/health');
        if (!isOnline) {
          setIsOnline(true);
          setShowOfflineAlert(false);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setIsOnline(false);
        if (showNotifications) {
          setShowOfflineAlert(true);
        }
      }
    };

    // Initial check
    checkHealth();

    // Set up periodic health checks
    intervalId = setInterval(checkHealth, checkInterval);

    // Listen to browser online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      checkHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (showNotifications) {
        setShowOfflineAlert(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInterval, isOnline, showNotifications]);

  if (!showNotifications) {
    return null;
  }

  return (
    <Snackbar
      open={showOfflineAlert}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 8 }}
    >
      <Alert severity="warning" sx={{ width: '100%' }}>
        You appear to be offline. Some features may not be available.
      </Alert>
    </Snackbar>
  );
};

export default HealthCheck;
