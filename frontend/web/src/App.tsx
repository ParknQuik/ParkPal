import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NavBar } from './components/NavBar';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './screens/Login';
// @ts-ignore - TODO: Convert remaining screens to TypeScript
import MapView from './screens/MapView.jsx';
// @ts-ignore - TODO: Convert remaining screens to TypeScript
import Reservation from './screens/Reservation.jsx';
// @ts-ignore - TODO: Convert remaining screens to TypeScript
import Payment from './screens/Payment.jsx';
import Profile from './screens/Profile';
// @ts-ignore - TODO: Convert remaining screens to TypeScript
import ListSlot from './screens/ListSlot.jsx';
// @ts-ignore - TODO: Convert remaining screens to TypeScript
import HostDashboard from './screens/HostDashboard.jsx';
// @ts-ignore - TODO: Convert remaining screens to TypeScript
import AdminDashboard from './screens/AdminDashboard.jsx';

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
            <Routes>
              <Route path="/" element={<Login />} />
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
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
export default App;
