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
	Chip
} from '@mui/material';
import api from '../api.jsx';

const Profile = () => {
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [bookings, setBookings] = useState([]);

	useEffect(() => {
		const userData = localStorage.getItem('user');
		if (userData) {
			setUser(JSON.parse(userData));
		}
		fetchBookings();
	}, []);

	const fetchBookings = async () => {
		try {
			const { data } = await api.get('/api/bookings');
			setBookings(data);
		} catch (error) {
			console.error('Error fetching bookings:', error);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		navigate('/');
	};

	return (
		<Container maxWidth="md" sx={{ mt: 4 }}>
			<Typography variant="h4" gutterBottom>
				Profile
			</Typography>

			<Card sx={{ mt: 3 }}>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						User Information
					</Typography>
					<Typography variant="body1">
						<strong>Name:</strong> {user?.name || 'N/A'}
					</Typography>
					<Typography variant="body1">
						<strong>Email:</strong> {user?.email || 'N/A'}
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
				<Button
					variant="contained"
					color="error"
					onClick={handleLogout}
					fullWidth
				>
					Logout
				</Button>
			</Box>
		</Container>
	);
};

export default Profile;
