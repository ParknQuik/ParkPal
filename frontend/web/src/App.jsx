import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './screens/Login.jsx';
import MapView from './screens/MapView.jsx';
import Reservation from './screens/Reservation.jsx';
import Payment from './screens/Payment.jsx';
import Profile from './screens/Profile.jsx';
import ListSlot from './screens/ListSlot.jsx';
import HostDashboard from './screens/HostDashboard.jsx';
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/reserve" element={<Reservation />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/list-slot" element={<ListSlot />} />
          <Route path="/host-dashboard" element={<HostDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
export default App;
