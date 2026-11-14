import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import QRCode from 'qrcode';
import {
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  ListAlt as ListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function HostDashboard() {
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, slotId: null });
  const [busyListingId, setBusyListingId] = useState(null);
  const [qrDialog, setQrDialog] = useState({ open: false, name: '', image: '', loading: false, error: '' });

  useEffect(() => {
    fetchHostData();
  }, []);


  const fetchHostData = async () => {
    try {
      setLoading(true);
      setError('');

      const listingsRes = await api.get('/marketplace/host/listings');
      setListings(Array.isArray(listingsRes.data) ? listingsRes.data : listingsRes.data.listings || []);

      // Fetch earnings
      const earningsRes = await api.get('/marketplace/host/earnings');
      setEarnings(earningsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
      console.error('Error fetching host data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    try {
      await api.delete(`/marketplace/listings/${deleteDialog.slotId}`);
      setDeleteDialog({ open: false, slotId: null });
      fetchHostData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete listing');
    }
  };

  const handleToggleListing = async (listing) => {
    setBusyListingId(listing.id);
    try {
      await api.patch(`/marketplace/listings/${listing.id}/toggle`, { isActive: !listing.isActive });
      await fetchHostData();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update listing availability');
    } finally { setBusyListingId(null); }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      occupied: 'error',
      reserved: 'warning',
      out_of_service: 'default',
    };
    return colors[status] || 'default';
  };

  const showListingQr = async (listing) => {
    setQrDialog({ open: true, name: listing.title || listing.address, image: '', loading: true, error: '' });
    try {
      const { data } = await api.get(`/marketplace/listings/${listing.id}`);
      const qrData = data?.qrCodeData || data?.data?.qrCodeData;
      if (!qrData) throw new Error('QR data is unavailable');
      const image = await QRCode.toDataURL(qrData, { width: 240, margin: 2 });
      setQrDialog((current) => ({ ...current, image, loading: false }));
    } catch (err) {
      setQrDialog((current) => ({ ...current, loading: false, error: err.response?.data?.error || 'Unable to load this listing QR code.' }));
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Host Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your parking listings and track your earnings
          </Typography>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchHostData}>Retry</Button>} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Earnings Summary */}
      {earnings && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <MoneyIcon color="primary" />
                  <Typography variant="h6">Total Earnings</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  ₱{earnings.summary.totalEarnings.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All-time revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <MoneyIcon color="warning" />
                  <Typography variant="h6">Pending Payout</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  ₱{earnings.summary.pendingPayout.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Awaiting transfer
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <ListIcon color="success" />
                  <Typography variant="h6">Total Bookings</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {earnings.summary.totalBookings}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed reservations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Listings Section */}
      <Paper sx={{ p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box><Typography variant="h5">My Listings ({listings.length})</Typography><Typography variant="body2" color="text.secondary">{listings.filter((listing) => listing.isActive).length} active</Typography></Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/list-slot')}
          >
            New Listing
          </Button>
        </Box>

        {listings.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No listings yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Create your first parking spot listing to start earning
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/list-slot')}
            >
              Create Listing
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Address</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Price/Hour</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {listing.address}
                      </Typography>
                      {listing.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {listing.description.substring(0, 50)}
                          {listing.description.length > 50 ? '...' : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={listing.slotType.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ₱{listing.price}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2">
                          {listing.rating.toFixed(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={listing.isActive ? listing.status : 'paused'}
                        color={listing.isActive ? getStatusColor(listing.status) : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigate(`/listing/${listing.id}`)
                        }
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => showListingQr(listing)} title="Show listing QR code" aria-label={`Show QR code for ${listing.title || listing.address}`}><span style={{ fontSize: 12, fontWeight: 700 }}>QR</span></IconButton>
                      <Button size="small" disabled={busyListingId === listing.id} onClick={() => handleToggleListing(listing)}>
                        {listing.isActive ? 'Pause' : 'Resume'}
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigate(`/list-slot?edit=${listing.id}`)
                        }
                        title="Edit"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setDeleteDialog({ open: true, slotId: listing.id })
                        }
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, slotId: null })}
      >
        <DialogTitle>Delete Listing?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this listing? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, slotId: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteListing} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={qrDialog.open} onClose={() => setQrDialog((current) => ({ ...current, open: false }))}>
        <DialogTitle>Listing QR code</DialogTitle>
        <DialogContent>
          <DialogContentText>{qrDialog.name}</DialogContentText>
          {qrDialog.loading && <CircularProgress sx={{ display: 'block', m: 3 }} />}
          {qrDialog.error && <Alert severity="error" sx={{ mt: 2 }}>{qrDialog.error}<Button onClick={() => { const listing = listings.find((item) => (item.title || item.address) === qrDialog.name); if (listing) showListingQr(listing); }}>Retry</Button></Alert>}
          {qrDialog.image && <Box component="img" src={qrDialog.image} alt={`QR code for ${qrDialog.name}`} sx={{ display: 'block', width: 240, height: 240, mx: 'auto', mt: 2 }} />}
        </DialogContent>
        <DialogActions><Button onClick={() => setQrDialog((current) => ({ ...current, open: false }))}>Close</Button></DialogActions>
      </Dialog>
    </Container>
  </Box>
  );
}
