import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import BloodBankMap from './pages/BloodBankMap';
import Inventory from './pages/Inventory';
import Utilization from './pages/Utilization';
import AdminPage from './pages/AdminPage';
import './App.css';

function App() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/BloodBankMap" replace />} />
          <Route path="/BloodBankMap" element={<BloodBankMap />} />
          <Route path="/Inventory" element={<Inventory />} />
          <Route path="/Utilization" element={<Utilization />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/Admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/BloodBankMap" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
