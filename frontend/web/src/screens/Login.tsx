import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Alert, Tab, Tabs } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
	email: string;
	password: string;
	name: string;
}

const Login: React.FC = () => {
	const navigate = useNavigate();
	const { login, register, isLoading } = useAuth();
	const [tab, setTab] = useState<number>(0);
	const [formData, setFormData] = useState<FormData>({
		email: '',
		password: '',
		name: ''
	});
	const [error, setError] = useState<string>('');

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
		setError('');

		try {
			console.log('Attempting login with:', formData.email);
			await login(formData.email, formData.password);
			console.log('Login successful, navigating to /map...');
			navigate('/map');
		} catch (err) {
			console.error('Login error:', err);
			setError(err instanceof Error ? err.message : 'Login failed');
		}
	};

	const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError('');

		try {
			await register(formData.name, formData.email, formData.password);
			navigate('/map');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Registration failed');
		}
	};

	return (
		<Container maxWidth="sm">
			<Box sx={{ mt: 8, mb: 4 }}>
				<Typography variant="h3" align="center" gutterBottom>
					ParknQuik
				</Typography>
				<Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
					Find and list parking spaces
				</Typography>

				<Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
					<Tabs value={tab} onChange={(_e, v) => setTab(v)} centered>
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
							disabled={isLoading}
						>
							{isLoading ? 'Logging in...' : 'Login'}
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
							disabled={isLoading}
						>
							{isLoading ? 'Creating account...' : 'Register'}
						</Button>
					</Box>
				)}
			</Box>
		</Container>
	);
};

export default Login;
