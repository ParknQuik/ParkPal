import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Alert, Tab, Tabs } from '@mui/material';
import api from '../api';
import type { AuthResponse } from '../types';
import { AxiosError } from 'axios';

interface FormData {
	email: string;
	password: string;
	name: string;
}

const Login: React.FC = () => {
	const navigate = useNavigate();
	const [tab, setTab] = useState<number>(0);
	const [formData, setFormData] = useState<FormData>({
		email: '',
		password: '',
		name: ''
	});
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);

	// Clear form when tab changes
	useEffect(() => {
		setFormData({
			email: '',
			password: '',
			name: ''
		});
		setError('');
	}, [tab]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
		console.log('handleLogin called!');
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			console.log('Attempting login with:', formData.email);
			const { data } = await api.post<AuthResponse>('/auth/login', {
				email: formData.email,
				password: formData.password
			});

			console.log('Login successful:', data);
			localStorage.setItem('token', data.token);
			localStorage.setItem('user', JSON.stringify(data.user));

			console.log('Navigating to /map...');
			// Always redirect to map
			navigate('/map');
		} catch (err) {
			console.error('Login error:', err);
			const axiosError = err as AxiosError<{ error: string }>;
			setError(axiosError.response?.data?.error || axiosError.message || 'Login failed');
		} finally {
			setLoading(false);
		}
	};

	const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			const { data } = await api.post<AuthResponse>('/auth/register', {
				name: formData.name,
				email: formData.email,
				password: formData.password
			});

			localStorage.setItem('token', data.token);
			localStorage.setItem('user', JSON.stringify(data.user));
			navigate('/map');
		} catch (err) {
			const axiosError = err as AxiosError<{ error: string }>;
			setError(axiosError.response?.data?.error || 'Registration failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container maxWidth="sm">
			<Box sx={{ mt: 8, mb: 4 }}>
				<Typography variant="h3" align="center" gutterBottom>
					ParkPal
				</Typography>
				<Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
					Find and list parking spaces
				</Typography>

				<Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
					<Tabs value={tab} onChange={(e, v) => setTab(v)} centered>
						<Tab label="Login" />
						<Tab label="Register" />
					</Tabs>
				</Box>

				{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

				{tab === 0 ? (
					<Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
						<TextField
							fullWidth
							label="Email"
							name="email"
							type="email"
							value={formData.email}
							onChange={handleChange}
							margin="normal"
							required
						/>
						<TextField
							fullWidth
							label="Password"
							name="password"
							type="password"
							value={formData.password}
							onChange={handleChange}
							margin="normal"
							required
						/>
						<Button
							fullWidth
							type="submit"
							variant="contained"
							size="large"
							sx={{ mt: 3 }}
							disabled={loading}
						>
							{loading ? 'Logging in...' : 'Login'}
						</Button>
					</Box>
				) : (
					<Box component="form" onSubmit={handleRegister} sx={{ mt: 3 }}>
						<TextField
							fullWidth
							label="Name"
							name="name"
							value={formData.name}
							onChange={handleChange}
							margin="normal"
							required
						/>
						<TextField
							fullWidth
							label="Email"
							name="email"
							type="email"
							value={formData.email}
							onChange={handleChange}
							margin="normal"
							required
						/>
						<TextField
							fullWidth
							label="Password"
							name="password"
							type="password"
							value={formData.password}
			onChange={handleChange}
							margin="normal"
							required
						/>
						<Button
							fullWidth
							type="submit"
							variant="contained"
							size="large"
							sx={{ mt: 3 }}
							disabled={loading}
						>
							{loading ? 'Creating account...' : 'Register'}
						</Button>
					</Box>
				)}
			</Box>
		</Container>
	);
};

export default Login;
