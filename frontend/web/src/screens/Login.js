import React, { useState } from 'react';

const Login = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		// Basic validation
		if (!email || !password) {
			setError('Please enter both email and password.');
			return;
		}
		setError('');
		// TODO: Add API call for login
		alert(`Logging in with: ${email}`);
	};

	return (
		<div style={{ maxWidth: 320, margin: '40px auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
			<h2>Login</h2>
			<form onSubmit={handleSubmit}>
				<div style={{ marginBottom: 16 }}>
					<label htmlFor="email">Email</label><br />
					<input
						type="email"
						id="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						style={{ width: '100%', padding: 8, marginTop: 4 }}
						required
					/>
				</div>
				<div style={{ marginBottom: 16 }}>
					<label htmlFor="password">Password</label><br />
					<input
						type="password"
						id="password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						style={{ width: '100%', padding: 8, marginTop: 4 }}
						required
					/>
				</div>
				{error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
				<button type="submit" style={{ width: '100%', padding: 10, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}>Login</button>
			</form>
		</div>
	);
};

export default Login;
