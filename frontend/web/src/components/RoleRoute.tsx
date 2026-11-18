import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RoleRoute: React.FC<{ roles: string[]; children: React.ReactNode; requiresHostCapability?: boolean }> = ({ roles, children, requiresHostCapability = false }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  if (user?.mustChangePassword) return <Navigate to="/admin-password" replace />;
  if (user?.role === 'admin' && sessionStorage.getItem('admin-mfa-verified') !== 'true') return <Navigate to="/admin-mfa" replace />;
  if (!user || !roles.includes(user.role) || (requiresHostCapability && !user.canHost && user.role !== 'host' && user.role !== 'admin')) return <Navigate to="/" replace />;
  return <>{children}</>;
};
