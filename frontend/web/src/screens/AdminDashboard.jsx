import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
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
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  People as UsersIcon,
  DirectionsCar as SlotsIcon,
  AttachMoney as RevenueIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import api from '../api';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 24 }}>
      {value === index && children}
    </div>
  );
}

export default function AdminDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSlots: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionDialog, setActionDialog] = useState({
    open: false,
    type: null,
    slotId: null,
    reason: '',
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all listings using marketplace search
      const listingsRes = await api.get('/api/marketplace/search');
      const allListings = listingsRes.data.listings || listingsRes.data || [];
      setListings(allListings);

      // Calculate stats (in a real app, this would be a dedicated endpoint)
      const pendingListings = allListings.filter(
        (slot) => !slot.isActive
      ).length;

      setStats({
        totalUsers: 5, // Placeholder - would come from API
        totalSlots: allListings.length,
        totalRevenue: 0, // Placeholder - would come from API
        pendingApprovals: pendingListings,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin data');
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveListing = async (slotId) => {
    try {
      // Update slot to active (approve)
      await api.put(`/api/slots/${slotId}`, { isActive: true });
      setActionDialog({ open: false, type: null, slotId: null, reason: '' });
      fetchAdminData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve listing');
    }
  };

  const handleRejectListing = async () => {
    try {
      const { slotId, reason } = actionDialog;
      // In a real app, you'd store the rejection reason
      await api.delete(`/api/slots/${slotId}`);
      setActionDialog({ open: false, type: null, slotId: null, reason: '' });
      fetchAdminData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject listing');
    }
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage platform listings, users, and operations
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <UsersIcon color="primary" />
                <Typography variant="h6">Total Users</Typography>
              </Box>
              <Typography variant="h4">{stats.totalUsers}</Typography>
              <Typography variant="body2" color="text.secondary">
                Registered accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <SlotsIcon color="success" />
                <Typography variant="h6">Total Listings</Typography>
              </Box>
              <Typography variant="h4">{stats.totalSlots}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active parking spots
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <RevenueIcon color="warning" />
                <Typography variant="h6">Platform Revenue</Typography>
              </Box>
              <Typography variant="h4">₱{stats.totalRevenue}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total commission
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningIcon color="error" />
                <Typography variant="h6">Pending</Typography>
              </Box>
              <Typography variant="h4">{stats.pendingApprovals}</Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
          <Tab label="All Listings" />
          <Tab label="Pending Approval" />
          <Tab label="Users" />
        </Tabs>
      </Paper>

      {/* All Listings Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            All Parking Listings
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Price/Hr</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id} hover>
                    <TableCell>{listing.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {listing.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={listing.slotType.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>₱{listing.price}</TableCell>
                    <TableCell>
                      <Chip
                        label={listing.status}
                        color={getStatusColor(listing.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={listing.isActive ? 'Yes' : 'No'}
                        color={listing.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="View Details">
                        <ViewIcon />
                      </IconButton>
                      {!listing.isActive && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApproveListing(listing.id)}
                            title="Approve"
                          >
                            <ApproveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'reject',
                                slotId: listing.id,
                                reason: '',
                              })
                            }
                            title="Reject"
                          >
                            <RejectIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Pending Approval Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pending Approval ({listings.filter((l) => !l.isActive).length})
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Price/Hr</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listings
                  .filter((listing) => !listing.isActive)
                  .map((listing) => (
                    <TableRow key={listing.id} hover>
                      <TableCell>{listing.id}</TableCell>
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
                            {listing.description.substring(0, 60)}...
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
                      <TableCell>₱{listing.price}</TableCell>
                      <TableCell>
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<ApproveIcon />}
                          onClick={() => handleApproveListing(listing.id)}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<RejectIcon />}
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              type: 'reject',
                              slotId: listing.id,
                              reason: '',
                            })
                          }
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          {listings.filter((l) => !l.isActive).length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No pending approvals
              </Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* Users Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Platform Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User management coming soon...
          </Typography>
        </Paper>
      </TabPanel>

      {/* Reject Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === 'reject'}
        onClose={() =>
          setActionDialog({ open: false, type: null, slotId: null, reason: '' })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Listing</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for rejecting this listing:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={actionDialog.reason}
            onChange={(e) =>
              setActionDialog({ ...actionDialog, reason: e.target.value })
            }
            placeholder="e.g., Invalid address, unclear photos, pricing issues..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setActionDialog({
                open: false,
                type: null,
                slotId: null,
                reason: '',
              })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectListing}
            color="error"
            variant="contained"
            disabled={!actionDialog.reason.trim()}
          >
            Reject Listing
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
