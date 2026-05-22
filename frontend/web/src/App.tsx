import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NavBar } from './components/NavBar';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

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

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <NavBar />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute>
                      <MapView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reserve"
                  element={
                    <ProtectedRoute>
                      <Reservation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment"
                  element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/list-slot"
                  element={
                    <ProtectedRoute>
                      <ListSlot />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/host-dashboard"
                  element={
                    <ProtectedRoute>
                      <HostDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* 404 Not Found */}
                <Route path="*" element={
                  <Suspense fallback={<LoadingSpinner />}>
                    {lazy(() => import('./screens/NotFound'))}
                  </Suspense>
                } />
              </Routes>
            </Suspense>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
export default App;
