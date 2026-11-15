import { lazy, Suspense, useEffect, useState } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { NavBar } from './components/NavBar';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import { initializePerformanceMonitoring, stopPerformanceMonitoring } from './utils/performance';
import { Box, Button, Container, Link as MuiLink, Paper, Typography } from '@mui/material';

// Lazy load screens for code splitting
const Login = lazy(() => import('./screens/Login'));
const Search = lazy(() => import('./screens/Search'));
const MapView = lazy(() => import('./screens/MapView.jsx'));
const Reservation = lazy(() => import('./screens/Reservation.jsx'));
const Payment = lazy(() => import('./screens/Payment.jsx'));
const Profile = lazy(() => import('./screens/Profile'));
const ListSlot = lazy(() => import('./screens/ListSlot.jsx'));
const HostDashboard = lazy(() => import('./screens/HostDashboard.jsx'));
const AdminDashboard = lazy(() => import('./screens/AdminDashboard.jsx'));
const AdminMetricsDashboard = lazy(() => import('./screens/AdminMetricsDashboard'));
const ListingDetail = lazy(() => import('./screens/ListingDetail.jsx'));
const BookingList = lazy(() => import('./screens/BookingList.jsx'));
const BookingDetail = lazy(() => import('./screens/BookingDetail.jsx'));
const NotFound = lazy(() => import('./screens/NotFound'));
const PrivacyPolicy = lazy(() => import('./screens/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./screens/TermsOfService'));

const pageMetadata: Record<string, { title: string; description: string }> = {
  '/': { title: 'Find parking near you | ParknQuik', description: 'Search bookable parking spaces near your destination and reserve ahead with ParknQuik.' },
  '/search': { title: 'Find parking near you | ParknQuik', description: 'Search bookable parking spaces near your destination and reserve ahead with ParknQuik.' },
  '/login': { title: 'Sign in or create an account | ParknQuik', description: 'Sign in to manage your ParknQuik bookings or create an account.' },
  '/map': { title: 'Parking map | ParknQuik', description: 'Explore parking spaces on the ParknQuik map.' },
  '/reserve': { title: 'Reserve parking | ParknQuik', description: 'Review your parking details and reserve a space with ParknQuik.' },
  '/payment': { title: 'Parking payment | ParknQuik', description: 'Complete payment for your ParknQuik parking reservation.' },
  '/profile': { title: 'Your profile | ParknQuik', description: 'Review and update your ParknQuik account details.' },
  '/list-slot': { title: 'List a parking space | ParknQuik', description: 'Create a parking listing for drivers to find and book.' },
  '/host-dashboard': { title: 'Host dashboard | ParknQuik', description: 'Manage your parking listings and reservations.' },
  '/admin-dashboard': { title: 'Admin dashboard | ParknQuik', description: 'Review ParknQuik operations and parking listings.' },
  '/admin-dashboard/metrics': { title: 'Metrics & health | ParknQuik', description: 'Review ParknQuik product metrics and engineering health.' },
  '/privacy': { title: 'Privacy policy | ParknQuik', description: 'Read how ParknQuik handles account, booking, and optional analytics information.' },
  '/terms': { title: 'Terms of service | ParknQuik', description: 'Review the draft terms for using ParknQuik parking search and booking services.' },
};

function SiteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const metadata = pageMetadata[pathname] ?? (pathname.startsWith('/listing/')
      ? { title: 'Parking listing | ParknQuik', description: 'View parking details and availability on ParknQuik.' }
      : pathname.startsWith('/bookings')
        ? { title: 'Your bookings | ParknQuik', description: 'View and manage your ParknQuik parking bookings.' }
        : { title: 'Page not found | ParknQuik', description: 'The page you requested could not be found.' });
    document.title = metadata.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = metadata.description;
    for (const [property, content] of [['og:title', metadata.title], ['og:description', metadata.description], ['twitter:title', metadata.title], ['twitter:description', metadata.description]]) {
      const tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`);
      if (tag) tag.content = content;
    }
  }, [pathname]);
  return null;
}

const consentKey = 'parkpal-analytics-consent';
function PrivacyControls() {
  const [choice, setChoice] = useState<string | null>(() => {
    try { return window.localStorage.getItem(consentKey); } catch { return 'rejected'; }
  });
  useEffect(() => {
    if (choice === 'accepted' && import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      initializePerformanceMonitoring('/api/v1/analytics/performance');
    } else stopPerformanceMonitoring();
  }, [choice]);
  useEffect(() => {
    const openPreferences = () => {
      try { window.localStorage.removeItem(consentKey); } catch { /* ignore storage errors */ }
      setChoice(null);
    };
    window.addEventListener('parkpal:privacy-choices', openPreferences);
    return () => window.removeEventListener('parkpal:privacy-choices', openPreferences);
  }, []);
  const saveChoice = (next: string) => {
    try { window.localStorage.setItem(consentKey, next); } catch { /* consent remains in memory for this visit */ }
    setChoice(next);
  };
  return <>
    {choice === null && <Paper role="region" aria-label="Privacy choices" elevation={8} sx={{ position: 'fixed', zIndex: 1300, left: 16, right: 16, bottom: 16, p: 2, maxWidth: 760, mx: 'auto' }}>
      <Typography variant="subtitle1" fontWeight={700}>Your privacy choices</Typography>
      <Typography variant="body2" sx={{ my: 1 }}>ParknQuik uses essential storage to keep you signed in. Optional performance analytics are off unless you allow them. Read our <MuiLink component={Link} to="/privacy">Privacy Policy</MuiLink>.</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => saveChoice('accepted')}>Allow optional analytics</Button>
        <Button variant="outlined" onClick={() => saveChoice('rejected')}>Reject optional analytics</Button>
      </Box>
    </Paper>}
    <Container component="footer" maxWidth="lg" sx={{ py: 3, mt: 4, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <MuiLink component={Link} to="/privacy">Privacy</MuiLink>
        <MuiLink component={Link} to="/terms">Terms</MuiLink>
        <Button size="small" onClick={() => { try { window.localStorage.removeItem(consentKey); } catch { /* ignore storage errors */ } setChoice(null); }}>Privacy choices</Button>
      </Box>
      <Button component={Link} to="/search" variant="contained">Find parking</Button>
    </Container>
  </>;
}

type ScreenRoute = {
  path: string;
  Screen: LazyExoticComponent<ComponentType>;
};

type RoleRestrictedRoute = ScreenRoute & {
  roles: string[];
};

const publicRoutes: ScreenRoute[] = [
  { path: '/', Screen: Search },
  { path: '/search', Screen: Search },
  { path: '/login', Screen: Login },
  { path: '/listing/:id', Screen: ListingDetail },
  { path: '/map', Screen: MapView },
];

const authenticatedRoutes: ScreenRoute[] = [
  { path: '/reserve', Screen: Reservation },
  { path: '/payment', Screen: Payment },
  { path: '/profile', Screen: Profile },
  { path: '/bookings', Screen: BookingList },
  { path: '/bookings/:id', Screen: BookingDetail },
];

const roleRestrictedRoutes: RoleRestrictedRoute[] = [
  { path: '/list-slot', Screen: ListSlot, roles: ['driver', 'host', 'admin'] },
  { path: '/host-dashboard', Screen: HostDashboard, roles: ['driver', 'host', 'admin'] },
  { path: '/admin-dashboard', Screen: AdminDashboard, roles: ['admin'] },
  { path: '/admin-dashboard/metrics', Screen: AdminMetricsDashboard, roles: ['admin'] },
];

function renderRoutes(
  routes: ScreenRoute[],
  wrapScreen?: (route: ScreenRoute, screen: ReactNode) => ReactNode,
) {
  return routes.map((route) => {
    const Screen = route.Screen;
    const screen = <Screen />;

    return (
      <Route
        key={route.path}
        path={route.path}
        element={wrapScreen ? wrapScreen(route, screen) : screen}
      />
    );
  });
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <Router>
          <AuthProvider>
            <SiteMetadata />
            <NavBar />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {renderRoutes(publicRoutes)}
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                {renderRoutes(authenticatedRoutes, (_route, screen) => (
                  <ProtectedRoute>{screen}</ProtectedRoute>
                ))}
                {renderRoutes(roleRestrictedRoutes, (route, screen) => (
                  <RoleRoute roles={(route as RoleRestrictedRoute).roles}>
                    {screen}
                  </RoleRoute>
                ))}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <PrivacyControls />
          </AuthProvider>
        </Router>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}
export default App;
