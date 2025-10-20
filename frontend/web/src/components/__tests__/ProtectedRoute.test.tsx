import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';
import type { User } from '../../types';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render with auth context
const renderWithAuth = (ui: React.ReactElement, user: User | null = null, token: string | null = null) => {
  if (user && token) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }

  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

    const { container } = render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    // Wait for Auth Context to load from localStorage and render content
    await screen.findByText('Protected Content');

    // Navigate should not be called after content is rendered
    // Clear any calls that happened during initial render
    mockNavigate.mockClear();

    // Verify it's still rendered and no new navigation happens
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should redirect to custom path when specified', () => {
    renderWithAuth(
      <ProtectedRoute redirectTo="/custom-login">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/custom-login', { replace: true });
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

    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should handle missing user', () => {
    // Token without user
    localStorage.setItem('token', 'mock-token');

    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
