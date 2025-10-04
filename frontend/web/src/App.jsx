import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './screens/Login.jsx';
import MapView from './screens/MapView.jsx';
import Reservation from './screens/Reservation.jsx';
import Payment from './screens/Payment.jsx';
import Profile from './screens/Profile.jsx';
import ListSlot from './screens/ListSlot.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/reserve" element={<Reservation />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/list-slot" element={<ListSlot />} />
      </Routes>
    </Router>
  );
}
export default App;
