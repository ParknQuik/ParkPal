import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { ProtectedRoute } from '../ProtectedRoute';
import { useLocation } from 'react-router-dom';
import { Route, Routes } from 'react-router-dom';
import type { User } from '../../types';

const CurrentPath = () => { const location = useLocation(); return <div data-testid="current-path">{location.pathname}{location.search}</div>; };
const renderProtected = (redirectTo = '/login') => render(<>
  <Routes>
    <Route path="/protected" element={<ProtectedRoute redirectTo={redirectTo}><div>Protected Content</div></ProtectedRoute>} />
    <Route path="/login" element={<div>Login screen</div>} />
    <Route path="/custom-login" element={<div>Custom login screen</div>} />
  </Routes>
  <CurrentPath />
</>);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/protected');
  });

  it('should render children when user is authenticated', async () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'driver',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    // Set localStorage before rendering
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'mock-token');

    renderProtected();

    // Wait for Auth Context to load from localStorage and render content
    await screen.findByText('Protected Content');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    renderProtected();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login?returnTo=%2F');
  });

  it('should redirect to custom path when specified', () => {
    renderProtected('/custom-login');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/custom-login?returnTo=%2F');
  });

  it('should handle missing token', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'driver',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    // User without token
    localStorage.setItem('user', JSON.stringify(mockUser));

    renderProtected();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login?returnTo=%2F');
  });

  it('should handle missing user', () => {
    // Token without user
    localStorage.setItem('token', 'mock-token');

    renderProtected();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login?returnTo=%2F');
  });
});
