import React, { useState, useEffect, useRef } from 'react';
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
	Grid,
	Avatar
} from '@mui/material';
import { Edit as EditIcon, Close as CloseIcon, PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import api from '../api';
import type { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

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
	vehicle?: { year?: number | null; make: string; model: string; color?: string | null; licensePlate: string } | null;
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

const convertToJpeg = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
	const image = new Image();
	const objectUrl = URL.createObjectURL(file);
	image.onload = () => {
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext('2d');
		if (!context) {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Could not process this image.'));
			return;
		}
		context.drawImage(image, 0, 0);
		canvas.toBlob((blob) => {
			URL.revokeObjectURL(objectUrl);
			blob ? resolve(blob) : reject(new Error('Could not convert this image to JPEG.'));
		}, 'image/jpeg', 0.8);
	};
	image.onerror = () => {
		URL.revokeObjectURL(objectUrl);
		reject(new Error('Could not read this image.'));
	};
	image.src = objectUrl;
});

const putFile = (url: string, file: Blob, onProgress: (progress: number) => void): Promise<void> =>
	new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open('PUT', url);
		request.setRequestHeader('Content-Type', 'image/jpeg');
		request.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
		};
		request.onload = () => request.status >= 200 && request.status < 300
			? resolve()
			: reject(new Error('Photo upload failed. Please try again.'));
		request.onerror = () => reject(new Error('Photo upload failed. Check your connection and try again.'));
		request.send(file);
	});

const Profile: React.FC = () => {
	const navigate = useNavigate();
	const { user: authUser, updateUser, logout } = useAuth();
	const [user, setUser] = useState<User | null>(null);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [stats, setStats] = useState<UserStats | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
	const [editForm, setEditForm] = useState({ name: '', phone: '' });
	const [saving, setSaving] = useState<boolean>(false);
	const [error, setError] = useState<string>('');
	const [success, setSuccess] = useState<string>('');
	const [uploadingPhoto, setUploadingPhoto] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const photoInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => setUser(authUser), [authUser]);

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
		logout();
		navigate('/');
	};

	const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			setError('Choose a valid image file.');
			return;
		}
		try {
			setUploadingPhoto(true);
			setUploadProgress(0);
			setError('');
			const jpeg = await convertToJpeg(file);
			const fileName = `profile-${Date.now()}.jpg`;
			const { data: signed } = await api.get<{ uploadUrl: string; fileName: string }>('/users/profile/upload-url', {
				params: { fileName, contentType: 'image/jpeg' }
			});
			await putFile(signed.uploadUrl, jpeg, setUploadProgress);
			const { data: updated } = await api.patch<User>('/users/profile/upload', { fileName: signed.fileName });
			const refreshed = { ...(authUser || user!), ...updated, profileImageUrl: updated.profileImageUrl ? `${updated.profileImageUrl}${updated.profileImageUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : null };
			updateUser(refreshed);
			setUser(refreshed);
			setSuccess('Profile photo updated.');
		} catch (err: any) {
			setError(err.response?.data?.error || err.message || 'Failed to upload profile photo.');
		} finally {
			setUploadingPhoto(false);
			setUploadProgress(0);
		}
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

			const refreshed = { ...data, profileImageUrl: data.profileImageUrl || user?.profileImageUrl || null };
			updateUser(refreshed);
			setUser(refreshed);
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
					{(user?.canHost || user?.role === 'host') && safeStats.totalListings !== undefined && (
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
				<CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.5 }}>
						<Avatar src={user?.profileImageUrl || undefined} sx={{ width: 80, height: 80, bgcolor: 'secondary.main', fontSize: 28 }}>
							{user?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
						</Avatar>
						<Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
							<Typography variant="overline" color="text.secondary">User Information</Typography>
							<Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>{user?.name || 'N/A'}</Typography>
							<Chip label={user?.role || 'N/A'} size="small" sx={{ mt: 1, textTransform: 'capitalize' }} />
						</Box>
						<Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditOpen} sx={{ alignSelf: { xs: 'auto', sm: 'flex-start' } }}>
							Edit profile
						</Button>
					</Box>
					<Button size="small" startIcon={<PhotoCameraIcon />} onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} sx={{ mt: 1.5 }}>
						{uploadingPhoto ? `Uploading ${uploadProgress}%` : 'Change photo'}
					</Button>
					<input ref={photoInputRef} hidden type="file" accept="image/*" onChange={handlePhotoSelected} aria-label="Choose profile photo" />
					{uploadingPhoto && <Typography variant="caption" color="text.secondary" role="status" sx={{ display: 'block' }}>Uploading profile photo… {uploadProgress}%</Typography>}
					{error && !editDialogOpen && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
					<Divider sx={{ my: 2.5 }} />
					<Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2, m: 0 }}>
						<Box component="div" sx={{ minWidth: 0 }}>
							<Typography component="dt" variant="caption" color="text.secondary">Email</Typography>
							<Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>{user?.email || 'N/A'}</Typography>
						</Box>
						<Box component="div">
							<Typography component="dt" variant="caption" color="text.secondary">Phone</Typography>
							<Typography component="dd" sx={{ m: 0 }}>{user?.phone || 'Not set'}</Typography>
						</Box>
					</Box>
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
											<Typography component="span" variant="body2">
												{booking.vehicle
													? `Vehicle: ${booking.vehicle.year || ''} ${booking.vehicle.make} ${booking.vehicle.model} · ${booking.vehicle.color || ''} · ${booking.vehicle.licensePlate}`
													: 'Vehicle details unavailable'}
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
				{(user?.canHost || user?.role === 'host') && (
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
			<Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth aria-labelledby="edit-profile-title">
				<DialogTitle id="edit-profile-title">
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						Edit Profile
						<IconButton onClick={handleEditClose} size="small" aria-label="Close">
							<CloseIcon />
						</IconButton>
					</Box>
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Update the details associated with your account.</Typography>
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
				<DialogActions sx={{ px: 3, pb: 3 }}>
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
