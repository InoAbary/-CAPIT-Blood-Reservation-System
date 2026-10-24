import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import './i18n.cjs'

import Register from './pages/Register'
import Login from './pages/Login'
import RegisterStaff from './pages/RegisterStaff'
import LoginStaff from './pages/LoginStaff'

import DonorDashboard from './pages/DonorDashboard'
import StaffDashboard from './pages/StaffDashboard'

import ProtectedRoute from './components/ProtectedRoute';
import BloodBankMap from './pages/BloodBankMap'
import Inventory from './pages/Inventory';
import Utilization from './pages/Utilization';
import BloodDonorForm from './pages/BloodDonorForm';
import FormDeny from './pages/FormDeny';
import FormPending from './pages/FormPending';
import BloodRequestForm from './pages/Bloodrequestform';
import BloodRequestsAdmin from './components/BloodRequestsAdmin';
import RegisterSuccess from './pages/RegisterSuccess';
import AdminBadgeTester from './pages/AdminBadgeTester'

import { AuthProvider } from './context/AuthContext'

function App() {
  const [count, setCount] = useState(0)

  return (
    <AuthProvider>
      <Routes>
        {/* ---- Public ---- */}
        <Route path="/Register" element={<Register />} />
        <Route path="/Register/Success" element={<RegisterSuccess />} />
        <Route path="/Register/Staff" element={<RegisterStaff />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Login/Staff" element={<LoginStaff />} />

        {/* ---- Donor-only ---- */}
        <Route
          path="/DonorDashboard"
          element={
            <ProtectedRoute require="donor" >
              <DonorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/BloodDonorForm"
          element={
            <ProtectedRoute require="donor" >
              <BloodDonorForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/FormDeny"
          element={
            <ProtectedRoute require="donor" >
              <FormDeny />
            </ProtectedRoute>
          }
        />
        <Route
          path="/FormPending"
          element={
            <ProtectedRoute require="donor" >
              <FormPending />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Request"
          element={
            <ProtectedRoute require="staff" allowedRoles={['hospital']} >
              <BloodRequestForm />
            </ProtectedRoute>
          }
        />

        {/* ---- Shared (donor + staff) ---- */}
        <Route
          path="/BloodBankMap"
          element={
            <ProtectedRoute >
              <BloodBankMap />
            </ProtectedRoute>
          }
        />

        {/* ---- Staff-only ---- */}
        <Route
          path="/StaffDashboard"
          element={
            <ProtectedRoute require="staff" >
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Inventory"
          element={
            <ProtectedRoute require="staff" >
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Utilization"
          element={
            <ProtectedRoute require="staff" >
              <Utilization />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Request-admin"
          element={
            <ProtectedRoute require="staff"  allowedRoles={['admin']}>
              <BloodRequestsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/AdminBadgeTester"
          element={
            <ProtectedRoute require="staff"  allowedRoles={['admin']}>
              <AdminBadgeTester />
            </ProtectedRoute>
          }
        />
        

        {/* ---- Fallback ---- */}
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    </AuthProvider>
    
  );
}


export default App
