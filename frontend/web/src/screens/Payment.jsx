import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
	Container,
	Box,
	Typography,
	Card,
	CardContent,
	FormControl,
	FormLabel,
	RadioGroup,
	FormControlLabel,
	Radio,
	Button,
	Alert,
	CircularProgress,
	Divider
} from '@mui/material';
import {
	CreditCard as CreditCardIcon,
	AccountBalanceWallet as WalletIcon,
	LocalTaxi as GrabPayIcon,
	Phone as PayMayaIcon
} from '@mui/icons-material';
import api from '../api';

const Payment = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const booking = location.state?.booking;
	const [paymentMethod, setPaymentMethod] = useState('gcash');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [processingStep, setProcessingStep] = useState('');

	if (!booking) {
		return (
			<Container>
				<Alert severity="error" sx={{ mt: 4 }}>
					No booking found. Please go back and create a reservation.
				</Alert>
				<Button onClick={() => navigate('/map')} sx={{ mt: 2 }}>
					Back to Map
				</Button>
			</Container>
		);
	}

	const paymentMethods = [
		{
			id: 'gcash',
			name: 'GCash',
			description: 'Most popular in Philippines',
			icon: <WalletIcon sx={{ fontSize: 40 }} />
		},
		{
			id: 'card',
			name: 'Credit/Debit Card',
			description: 'Visa, Mastercard',
			icon: <CreditCardIcon sx={{ fontSize: 40 }} />
		},
		{
			id: 'grab_pay',
			name: 'GrabPay',
			description: 'Pay with GrabPay wallet',
			icon: <GrabPayIcon sx={{ fontSize: 40 }} />
		},
		{
			id: 'paymaya',
			name: 'PayMaya',
			description: 'Digital wallet',
			icon: <PayMayaIcon sx={{ fontSize: 40 }} />
		}
	];

	const handlePayment = async () => {
		setLoading(true);
		setError('');
		setProcessingStep('Creating payment intent...');

		try {
			// Step 1: Create payment intent
			const intentResponse = await api.post('/api/v1/payments/intent', {
				bookingId: booking.id,
				amount: booking.price * 100, // Convert to cents
				paymentMethod
			});

			const { paymentIntentId, clientKey } = intentResponse.data;
			setProcessingStep('Payment intent created. Redirecting to payment...');

			// Step 2: For e-wallets (GCash, GrabPay, PayMaya), redirect to payment page
			if (paymentMethod === 'gcash' || paymentMethod === 'grab_pay' || paymentMethod === 'paymaya') {
				// In production, this would redirect to PayMongo checkout page
				// For now, show success message
				alert(`Payment Intent Created!\n\nPayment ID: ${paymentIntentId}\n\nIn production, you would be redirected to ${paymentMethod.toUpperCase()} to complete payment.\n\nClient Key: ${clientKey}`);

				// For demo purposes, auto-confirm the payment
				setProcessingStep('Confirming payment...');
				await confirmPayment(paymentIntentId);
			}
			// Step 3: For card payments, would show card input form
			else if (paymentMethod === 'card') {
				// In production, integrate PayMongo.js SDK for card input
				alert(`Card Payment\n\nPayment ID: ${paymentIntentId}\n\nIn production, a secure card input form would appear here using PayMongo.js SDK.\n\nClient Key: ${clientKey}`);

				// For demo purposes, auto-confirm the payment
				setProcessingStep('Processing card payment...');
				await confirmPayment(paymentIntentId);
			}

		} catch (err) {
			console.error('Payment error:', err);
			setError(err.response?.data?.error || err.message || 'Payment failed');
			setLoading(false);
			setProcessingStep('');
		}
	};

	const confirmPayment = async (paymentIntentId) => {
		try {
			const confirmResponse = await api.post('/api/v1/payments/confirm', {
				paymentIntentId
			});

			if (confirmResponse.data.status === 'succeeded') {
				setProcessingStep('Payment successful!');
				// Navigate to success page or bookings
				setTimeout(() => {
					alert('Payment successful! Your booking is confirmed.');
					navigate('/bookings');
				}, 1500);
			} else {
				throw new Error('Payment confirmation failed');
			}
		} catch (err) {
			console.error('Confirmation error:', err);
			setError(err.response?.data?.error || err.message || 'Payment confirmation failed');
			setLoading(false);
			setProcessingStep('');
		}
	};

	return (
		<Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
			<Typography variant="h4" gutterBottom fontWeight="bold">
				Complete Payment
			</Typography>

			<Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 3 }}>
				{/* Left Column - Booking Summary */}
				<Card sx={{ flex: '1 1 300px' }}>
					<CardContent>
						<Typography variant="h6" gutterBottom fontWeight="bold">
							Booking Summary
						</Typography>
						<Divider sx={{ my: 2 }} />
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography color="text.secondary">Booking ID:</Typography>
								<Typography fontWeight="600">#{booking.id}</Typography>
							</Box>
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography color="text.secondary">Parking Fee:</Typography>
								<Typography fontWeight="600">${booking.price}</Typography>
							</Box>
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography color="text.secondary">Service Fee:</Typography>
								<Typography fontWeight="600">$2.00</Typography>
							</Box>
							<Divider />
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography variant="h6" fontWeight="bold">Total:</Typography>
								<Typography variant="h6" color="primary" fontWeight="bold">
									${(booking.price + 2).toFixed(2)}
								</Typography>
							</Box>
						</Box>
					</CardContent>
				</Card>

				{/* Right Column - Payment Method Selection */}
				<Box sx={{ flex: '2 1 500px' }}>
					{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

					{processingStep && (
						<Alert severity="info" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
							<CircularProgress size={20} sx={{ mr: 2 }} />
							{processingStep}
						</Alert>
					)}

					<Card>
						<CardContent>
							<FormControl component="fieldset" fullWidth>
								<FormLabel component="legend" sx={{ mb: 3, fontWeight: 'bold', fontSize: '1.1rem' }}>
									Choose Payment Method
								</FormLabel>
								<RadioGroup
									value={paymentMethod}
									onChange={(e) => setPaymentMethod(e.target.value)}
								>
									{paymentMethods.map((method) => (
										<Card
											key={method.id}
											variant="outlined"
											sx={{
												mb: 2,
												cursor: 'pointer',
												border: paymentMethod === method.id ? 2 : 1,
												borderColor: paymentMethod === method.id ? 'primary.main' : 'divider',
												bgcolor: paymentMethod === method.id ? 'primary.50' : 'background.paper',
												transition: 'all 0.2s',
												'&:hover': {
													borderColor: 'primary.main',
													boxShadow: 1
												}
											}}
											onClick={() => setPaymentMethod(method.id)}
										>
											<CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
												<Box sx={{ color: 'primary.main' }}>
													{method.icon}
												</Box>
												<Box sx={{ flex: 1 }}>
													<Typography variant="h6" fontWeight="600">
														{method.name}
													</Typography>
													<Typography variant="body2" color="text.secondary">
														{method.description}
													</Typography>
												</Box>
												<Radio
													checked={paymentMethod === method.id}
													value={method.id}
													onChange={() => {}}
												/>
											</CardContent>
										</Card>
									))}
								</RadioGroup>
							</FormControl>

							<Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
								<Button
									variant="outlined"
									onClick={() => navigate(-1)}
									fullWidth
									disabled={loading}
									size="large"
								>
									Cancel
								</Button>
								<Button
									variant="contained"
									onClick={handlePayment}
									disabled={loading}
									fullWidth
									size="large"
									sx={{
										py: 1.5,
										fontWeight: 'bold',
										fontSize: '1rem'
									}}
								>
									{loading ? (
										<>
											<CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
											Processing...
										</>
									) : (
										`Pay $${(booking.price + 2).toFixed(2)}`
									)}
								</Button>
							</Box>
						</CardContent>
					</Card>

					<Alert severity="info" sx={{ mt: 2 }}>
						<Typography variant="body2">
							💳 <strong>Demo Mode:</strong> This is using PayMongo test environment.
							No real money will be charged.
						</Typography>
					</Alert>
				</Box>
			</Box>
		</Container>
	);
};

export default Payment;
