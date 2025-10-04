import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './screens/Login';
import MapView from './screens/MapView';
import Reservation from './screens/Reservation';
import Payment from './screens/Payment';
import Profile from './screens/Profile';
import ListSlot from './screens/ListSlot';

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
