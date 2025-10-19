import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	Card,
	CardContent,
	Button,
	Chip,
	CircularProgress,
	Alert,
	Grid,
	AppBar,
	Toolbar,
	IconButton,
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	Star as StarIcon,
	LocationOn as LocationIcon,
} from '@mui/icons-material';
import api from '../api.jsx';

const ListingDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [listing, setListing] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		fetchListing();
	}, [id]);

	const fetchListing = async () => {
		try {
			setLoading(true);
			const { data } = await api.get(`/api/marketplace/listings/${id}`);
			setListing(data);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to load listing');
			console.error('Error fetching listing:', err);
		} finally {
			setLoading(false);
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
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
				<CircularProgress />
			</Box>
		);
	}

	if (error || !listing) {
		return (
			<Container maxWidth="md" sx={{ mt: 4 }}>
				<Alert severity="error">{error || 'Listing not found'}</Alert>
				<Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
					Go Back
				</Button>
			</Container>
		);
	}

	return (
		<Box>
			<AppBar position="static">
				<Toolbar>
					<IconButton
						edge="start"
						color="inherit"
						onClick={() => navigate(-1)}
						sx={{ mr: 2 }}
					>
						<ArrowBackIcon />
					</IconButton>
					<Typography variant="h6" sx={{ flexGrow: 1 }}>
						Listing Details
					</Typography>
				</Toolbar>
			</AppBar>

			<Container maxWidth="md" sx={{ py: 4 }}>
				<Card>
					<CardContent>
						<Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
							<Box>
								<Typography variant="h4" gutterBottom>
									₱{listing.price}/hour
								</Typography>
								<Chip
									label={listing.slotType?.replace('_', ' ').toUpperCase()}
									variant="outlined"
									sx={{ mb: 1 }}
								/>
							</Box>
							<Chip
								label={listing.status}
								color={getStatusColor(listing.status)}
								size="large"
							/>
						</Box>

						<Box display="flex" alignItems="center" gap={1} mb={2}>
							<LocationIcon color="action" />
							<Typography variant="h6">{listing.address}</Typography>
						</Box>

						{listing.description && (
							<Box mb={3}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Description
								</Typography>
								<Typography variant="body1" color="text.secondary">
									{listing.description}
								</Typography>
							</Box>
						)}

						{listing.rating > 0 && (
							<Box display="flex" alignItems="center" gap={1} mb={3}>
								<StarIcon sx={{ color: 'warning.main' }} />
								<Typography variant="h6">
									{listing.rating.toFixed(1)} / 5.0
								</Typography>
							</Box>
						)}

						{listing.amenities && listing.amenities.length > 0 && (
							<Box mb={3}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Amenities
								</Typography>
								<Box display="flex" gap={1} flexWrap="wrap">
									{listing.amenities.map((amenity, idx) => (
										<Chip key={idx} label={amenity} variant="outlined" />
									))}
								</Box>
							</Box>
						)}

						<Grid container spacing={2} mb={3}>
							<Grid item xs={6}>
								<Typography variant="body2" color="text.secondary">
									Latitude
								</Typography>
								<Typography variant="body1">{listing.lat}</Typography>
							</Grid>
							<Grid item xs={6}>
								<Typography variant="body2" color="text.secondary">
									Longitude
								</Typography>
								<Typography variant="body1">{listing.lon}</Typography>
							</Grid>
						</Grid>

						<Box display="flex" gap={2}>
							<Button
								variant="contained"
								fullWidth
								onClick={() => navigate(`/list-slot?edit=${listing.id}`)}
							>
								Edit Listing
							</Button>
							<Button
								variant="outlined"
								fullWidth
								onClick={() => navigate(-1)}
							>
								Back
							</Button>
						</Box>
					</CardContent>
				</Card>
			</Container>
		</Box>
	);
};

export default ListingDetail;
