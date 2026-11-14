import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '../../test/utils';
import { Route, Routes, useLocation } from 'react-router-dom';
import { RoleRoute } from '../RoleRoute';

const CurrentPath = () => { const location = useLocation(); return <div data-testid="path">{location.pathname}{location.search}</div>; };
const renderAdminRoute = () => render(<>
  <Routes>
    <Route path="/admin-dashboard" element={<RoleRoute roles={['admin']}><div>Admin tools</div></RoleRoute>} />
    <Route path="/login" element={<div>Login</div>} />
    <Route path="/" element={<div>Public search</div>} />
  </Routes>
  <CurrentPath />
</>);

describe('RoleRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/admin-dashboard');
  });

  it('allows an admin into candidate operations', () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'admin@example.com', name: 'Admin', role: 'admin' }));
    localStorage.setItem('token', 'token');
    renderAdminRoute();
    expect(screen.getByText('Admin tools')).toBeInTheDocument();
  });

  it('sends a signed-in driver away from admin operations', () => {
    localStorage.setItem('user', JSON.stringify({ id: 2, email: 'driver@example.com', name: 'Driver', role: 'driver' }));
    localStorage.setItem('token', 'token');
    renderAdminRoute();
    expect(screen.queryByText('Admin tools')).not.toBeInTheDocument();
    expect(screen.getByText('Public search')).toBeInTheDocument();
  });

  it('preserves the admin return path for a visitor who needs to sign in', () => {
    renderAdminRoute();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/login?returnTo=%2Fadmin-dashboard');
  });
});
