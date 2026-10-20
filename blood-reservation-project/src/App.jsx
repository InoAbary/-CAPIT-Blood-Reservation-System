import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

import ProtectedRoute from './ProtectedRoute';
import BloodBankMap from './pages/BloodBankMap'
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/BloodBankMap" element = {<BloodBankMap />} />
        <Route path="/Inventory" element={<Inventory />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    
  );
}


export default App
