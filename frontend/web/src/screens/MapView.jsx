import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Card,
	CardContent,
	Typography,
	Button,
	Grid,
	AppBar,
	Toolbar,
	IconButton,
	Chip
} from '@mui/material';
import { AccountCircle, Add, LocationOn } from '@mui/icons-material';
import api from '../api.jsx';

const MapView = () => {
	const navigate = useNavigate();
	const [slots, setSlots] = useState([]);
	const [user, setUser] = useState(null);

	useEffect(() => {
		const userData = localStorage.getItem('user');
		if (userData) setUser(JSON.parse(userData));
		fetchSlots();
	}, []);

	const fetchSlots = async () => {
		try {
			const { data } = await api.get('/api/slots');
			setSlots(data);
		} catch (error) {
			console.error('Error fetching slots:', error);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		navigate('/');
	};

	return (
		<Box>
			<AppBar position="static">
				<Toolbar>
					<Typography variant="h6" sx={{ flexGrow: 1 }}>
						ParkPal
					</Typography>
					<IconButton color="inherit" onClick={() => navigate('/profile')}>
						<AccountCircle />
					</IconButton>
				</Toolbar>
			</AppBar>

			<Container sx={{ mt: 4 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
					<Typography variant="h4">Available Parking Slots</Typography>
					<Button
						variant="contained"
						startIcon={<Add />}
						onClick={() => navigate('/list-slot')}
					>
						List Your Slot
					</Button>
				</Box>

				<Grid container spacing={3}>
					{slots.map((slot) => (
						<Grid item xs={12} md={6} lg={4} key={slot.id}>
							<Card>
								<CardContent>
									<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
										<Typography variant="h6">${slot.price}/hr</Typography>
										<Chip
											label={slot.status}
											color={slot.status === 'available' ? 'success' : 'default'}
											size="small"
										/>
									</Box>
									<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
										<LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
										<Typography variant="body2" color="text.secondary">
											{slot.address || `${slot.lat}, ${slot.lon}`}
										</Typography>
									</Box>
									<Typography variant="body2" color="text.secondary" gutterBottom>
										Owner: {slot.owner?.name || 'N/A'}
									</Typography>
									<Button
										fullWidth
										variant="contained"
										onClick={() => navigate('/reserve', { state: { slot } })}
										disabled={slot.status !== 'available'}
										sx={{ mt: 2 }}
									>
										Reserve
									</Button>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>

				{slots.length === 0 && (
					<Box sx={{ textAlign: 'center', mt: 8 }}>
						<Typography variant="h6" color="text.secondary">
							No parking slots available at the moment
						</Typography>
					</Box>
				)}
			</Container>
		</Box>
	);
};

export default MapView;
