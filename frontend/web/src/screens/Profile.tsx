import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	Card,
	CardContent,
	Button,
	List,
	ListItem,
	ListItemText,
	Divider,
	Chip,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Alert,
	Snackbar,
	IconButton,
	Grid
} from '@mui/material';
import { Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../api';
import type { User } from '../types';

interface BookingSlot {
	id: number;
	address: string;
	lat: number;
	lon: number;
}

interface Booking {
	id: number;
	slotId: number;
	userId: number;
	status: string;
	startTime: string;
	endTime: string;
	price: number;
	slot?: BookingSlot;
}

interface UserStats {
	totalBookings: number;
	activeBookings: number;
	completedBookings: number;
	totalSpent: number;
	totalListings?: number;
	totalEarnings?: number;
	totalHostBookings?: number;
}

const Profile: React.FC = () => {
	const navigate = useNavigate();
	const [user, setUser] = useState<User | null>(null);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [stats, setStats] = useState<UserStats | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
	const [editForm, setEditForm] = useState({ name: '', phone: '' });
	const [saving, setSaving] = useState<boolean>(false);
	const [error, setError] = useState<string>('');
	const [success, setSuccess] = useState<string>('');

	useEffect(() => {
		const userData = localStorage.getItem('user');
		if (userData) {
			setUser(JSON.parse(userData) as User);
		}
		fetchData();
	}, []);

	const fetchData = async (): Promise<void> => {
		try {
			setLoading(true);
			const [bookingsRes, statsRes] = await Promise.all([
				api.get<Booking[]>('/bookings'),
				api.get<UserStats>('/users/stats')
			]);
			setBookings(bookingsRes.data);
			setStats(statsRes.data);
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = (): void => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		navigate('/');
	};

	const handleEditOpen = (): void => {
		setEditForm({
			name: user?.name || '',
			phone: user?.phone || ''
		});
		setEditDialogOpen(true);
	};

	const handleEditClose = (): void => {
		setEditDialogOpen(false);
		setError('');
	};

	const handleEditSave = async (): Promise<void> => {
		try {
			setSaving(true);
			setError('');

			if (!editForm.name.trim()) {
				setError('Name is required');
				return;
			}

			const { data } = await api.patch<User>('/users/profile', {
				name: editForm.name.trim(),
				phone: editForm.phone.trim() || null
			});

			setUser(data);
			localStorage.setItem('user', JSON.stringify(data));
			setSuccess('Profile updated successfully');
			setEditDialogOpen(false);
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update profile');
		} finally {
			setSaving(false);
		}
	};

	const safeStats = stats
		? {
			totalBookings: stats.totalBookings ?? 0,
			activeBookings: stats.activeBookings ?? 0,
			completedBookings: stats.completedBookings ?? 0,
			totalSpent: stats.totalSpent ?? 0,
			totalListings: stats.totalListings,
			totalEarnings: stats.totalEarnings ?? 0,
			totalHostBookings: stats.totalHostBookings ?? 0
		}
		: null;

	if (loading) {
		return (
			<Container maxWidth="md" sx={{ mt: 4 }}>
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
					<CircularProgress />
				</Box>
			</Container>
		);
	}

	return (
		<Container maxWidth="md" sx={{ mt: 4 }}>
			<Typography variant="h4" gutterBottom>
				Profile
			</Typography>

			{/* User Stats */}
			{safeStats && (
				<Grid container spacing={2} sx={{ mt: 2 }}>
					<Grid item xs={6} sm={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="h4" color="primary">
									{safeStats.totalBookings}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Total Bookings
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="h4" color="success.main">
									{safeStats.activeBookings}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Active
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="h4" color="text.secondary">
									{safeStats.completedBookings}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Completed
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="h4" color="secondary">
									₱{safeStats.totalSpent.toFixed(2)}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Total Spent
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					{user?.role === 'host' && safeStats.totalListings !== undefined && (
						<>
							<Grid item xs={6} sm={4}>
								<Card>
									<CardContent sx={{ textAlign: 'center' }}>
										<Typography variant="h4" color="primary">
											{safeStats.totalListings}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Listings
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={6} sm={4}>
								<Card>
									<CardContent sx={{ textAlign: 'center' }}>
										<Typography variant="h4" color="success.main">
											₱{safeStats.totalEarnings.toFixed(2)}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Earnings
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={6} sm={4}>
								<Card>
									<CardContent sx={{ textAlign: 'center' }}>
										<Typography variant="h4" color="text.secondary">
											{safeStats.totalHostBookings}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Host Bookings
										</Typography>
									</CardContent>
								</Card>
							</Grid>
						</>
					)}
				</Grid>
			)}

			<Card sx={{ mt: 3 }}>
				<CardContent>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
						<Typography variant="h6">
							User Information
						</Typography>
						<IconButton onClick={handleEditOpen} size="small" aria-label="Edit profile">
							<EditIcon />
						</IconButton>
					</Box>
					<Typography variant="body1">
						<strong>Name:</strong> {user?.name || 'N/A'}
					</Typography>
					<Typography variant="body1">
						<strong>Email:</strong> {user?.email || 'N/A'}
					</Typography>
					<Typography variant="body1">
						<strong>Phone:</strong> {user?.phone || 'Not set'}
					</Typography>
					<Typography variant="body1">
						<strong>Role:</strong> {user?.role || 'N/A'}
					</Typography>
				</CardContent>
			</Card>

			<Card sx={{ mt: 3 }}>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						My Bookings
					</Typography>
					{bookings.length > 0 ? (
						<List>
							{bookings.map((booking, index) => (
								<React.Fragment key={booking.id}>
									{index > 0 && <Divider />}
									<ListItem>
										<ListItemText
											primary={`Booking #${booking.id}`}
											secondary={
												<>
													<Typography component="span" variant="body2">
														Location: {booking.slot?.address || `${booking.slot?.lat}, ${booking.slot?.lon}`}
													</Typography>
													<br />
													<Typography component="span" variant="body2">
														Price: ${booking.price}
													</Typography>
													<br />
													<Chip
														label={booking.status}
														size="small"
														color={booking.status === 'confirmed' ? 'success' : 'default'}
														sx={{ mt: 1 }}
													/>
												</>
											}
										/>
									</ListItem>
								</React.Fragment>
							))}
						</List>
					) : (
						<Typography variant="body2" color="text.secondary">
							No bookings yet
						</Typography>
					)}
				</CardContent>
			</Card>

			<Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
				<Button
					variant="outlined"
					onClick={() => navigate('/map')}
					fullWidth
				>
					Back to Map
				</Button>
				{user?.role === 'host' && (
					<Button
						variant="outlined"
						onClick={() => navigate('/host-dashboard')}
						fullWidth
					>
						Host Dashboard
					</Button>
				)}
				<Button
					variant="contained"
					color="error"
					onClick={handleLogout}
					fullWidth
				>
					Logout
				</Button>
			</Box>

			{/* Edit Profile Dialog */}
			<Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						Edit Profile
						<IconButton onClick={handleEditClose} size="small" aria-label="Close">
							<CloseIcon />
						</IconButton>
					</Box>
				</DialogTitle>
				<DialogContent>
					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}
					<TextField
						label="Name"
						value={editForm.name}
						onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
						fullWidth
						margin="normal"
						required
						autoFocus
					/>
					<TextField
						label="Phone"
						value={editForm.phone}
						onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
						fullWidth
						margin="normal"
						placeholder="Optional"
					/>
					<TextField
						label="Email"
						value={user?.email || ''}
						fullWidth
						margin="normal"
						disabled
						helperText="Email cannot be changed"
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleEditClose} disabled={saving}>
						Cancel
					</Button>
					<Button
						onClick={handleEditSave}
						variant="contained"
						disabled={saving}
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Success Snackbar */}
			<Snackbar
				open={!!success}
				autoHideDuration={3000}
				onClose={() => setSuccess('')}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert severity="success" onClose={() => setSuccess('')}>
					{success}
				</Alert>
			</Snackbar>
		</Container>
	);
};

export default Profile;
