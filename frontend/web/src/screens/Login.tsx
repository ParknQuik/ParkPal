import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, Button, Typography, Container, Alert, Tab, Tabs } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from '../schemas/auth.schema';

const Login: React.FC = () => {
	const navigate = useNavigate();
	const { login, register: registerUser, isLoading } = useAuth();
	const [tab, setTab] = useState<number>(0);
	const [error, setError] = useState<string>('');

	const {
		register: registerLogin,
		handleSubmit: handleSubmitLogin,
		formState: { errors: loginErrors },
		reset: resetLogin,
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		mode: 'onBlur',
	});

	const {
		register: registerRegister,
		handleSubmit: handleSubmitRegister,
		formState: { errors: registerErrors },
		reset: resetRegister,
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		mode: 'onBlur',
	});

	// Clear form when tab changes
	useEffect(() => {
		resetLogin();
		resetRegister();
		setError('');
	}, [tab, resetLogin, resetRegister]);

	const onLoginSubmit = async (data: LoginFormData) => {
		console.log('handleLogin called!');
		setError('');

		try {
			console.log('Attempting login with:', data.email);
			await login(data.email, data.password);
			console.log('Login successful, navigating to /map...');
			navigate('/map');
		} catch (err) {
			console.error('Login error:', err);
			setError(err instanceof Error ? err.message : 'Login failed');
		}
	};

	const onRegisterSubmit = async (data: RegisterFormData) => {
		setError('');

		try {
			await registerUser(data.name, data.email, data.password);
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
					<Box component="form" onSubmit={handleSubmitLogin(onLoginSubmit)} sx={{ mt: 3 }}>
						<TextField
							fullWidth
							label="Email"
							type="email"
							{...registerLogin('email')}
							error={!!loginErrors.email}
							helperText={loginErrors.email?.message}
							margin="normal"
						/>
						<TextField
							fullWidth
							label="Password"
							type="password"
							{...registerLogin('password')}
							error={!!loginErrors.password}
							helperText={loginErrors.password?.message}
							margin="normal"
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
					<Box component="form" onSubmit={handleSubmitRegister(onRegisterSubmit)} sx={{ mt: 3 }}>
						<TextField
							fullWidth
							label="Name"
							{...registerRegister('name')}
							error={!!registerErrors.name}
							helperText={registerErrors.name?.message}
							margin="normal"
						/>
						<TextField
							fullWidth
							label="Email"
							type="email"
							{...registerRegister('email')}
							error={!!registerErrors.email}
							helperText={registerErrors.email?.message}
			margin="normal"
						/>
						<TextField
							fullWidth
							label="Password"
							type="password"
							{...registerRegister('password')}
							error={!!registerErrors.password}
							helperText={registerErrors.password?.message}
							margin="normal"
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
