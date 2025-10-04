import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Alert, Tab, Tabs } from '@mui/material';
import api from '../api';

const Login = () => {
	const navigate = useNavigate();
	const [tab, setTab] = useState(0);
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		name: ''
	});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			const { data } = await api.post('/api/auth/login', {
				email: formData.email,
				password: formData.password
			});

			localStorage.setItem('token', data.token);
			localStorage.setItem('user', JSON.stringify(data.user));
			navigate('/map');
		} catch (err) {
			setError(err.response?.data?.error || 'Login failed');
		} finally {
			setLoading(false);
		}
	};

	const handleRegister = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			const { data } = await api.post('/api/auth/register', {
				name: formData.name,
				email: formData.email,
				password: formData.password
			});

			localStorage.setItem('token', data.token);
			localStorage.setItem('user', JSON.stringify(data.user));
			navigate('/map');
		} catch (err) {
			setError(err.response?.data?.error || 'Registration failed');
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
