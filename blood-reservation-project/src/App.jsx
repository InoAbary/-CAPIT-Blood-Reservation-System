import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import './i18n.js'

import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import RegisterStaff from './pages/RegisterStaff'
import LoginStaff from './pages/LoginStaff'
import ForgotPasswordStaff from './pages/ForgotPasswordStaff'
import ResetPasswordStaff from './pages/ResetPasswordStaff'

import DonorDashboard from './pages/DonorDashboard'
import DonorProfile from './pages/DonorProfile'
import ChangeMobileNumber, { ConfirmMobileNumber } from './pages/ChangeMobileNumber';
import StaffDashboard from './pages/StaffDashboard'

import ProtectedRoute from './components/ProtectedRoute';
import BloodBankMap from './pages/BloodBankMap'
import Inventory from './pages/Inventory';
import Utilization from './pages/Utilization';
import BloodDonorForm from './pages/BloodDonorForm';
import BookAppointment from './pages/BookAppointment';
import FormDeny from './pages/FormDeny';
import FormPending from './pages/FormPending';
import BloodRequestForm from './pages/Bloodrequestform';
import BloodRequestsAdmin from './pages/Bloodrequestsadmin';
import RegisterSuccess from './pages/RegisterSuccess';

import AdminLayout from './pages/admin/AdminLayout';
import OverviewPage from './pages/admin/OverviewPage';
import UserDirectoryPage from './pages/admin/UserDirectoryPage';
import ProvisionSupervisorPage from './pages/admin/ProvisionSupervisorPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import AdminChangeOwner from './pages/admin/AdminChangeOwner';
import BranchAdminLayout from './pages/branch-admin/BranchAdminLayout';
import BranchDashboard from './pages/branch-admin/BranchDashboard';

import { AuthProvider } from './context/AuthContext'

function App() {
  const [count, setCount] = useState(0)

  return (
    <AuthProvider>
    <Routes>
    {/* ---- Public ---- */}
    <Route path="/donor/change-number/confirm" element={<ConfirmMobileNumber />} />
    <Route path="/Register" element={<Register />} />
    <Route path="/Register/Success" element={<RegisterSuccess />} />
    <Route path="/Register/Staff" element={<RegisterStaff />} />
    <Route path="/Login" element={<Login />} />
    <Route path="/ForgotPassword" element={<ForgotPassword />} />
    <Route path="/resetPassword" element={<ResetPassword />} />
    <Route path="/Login/Staff" element={<LoginStaff />} />
    <Route path="/ForgotPassword/Staff" element={<ForgotPasswordStaff />} />
    <Route path="/ResetPassword/Staff" element={<ResetPasswordStaff />} />

    {/* ---- Donor-only ---- */}
    <Route path="/donor/change-number" element={<ProtectedRoute require="donor"><ChangeMobileNumber /></ProtectedRoute>} />
    <Route path="/donor/profile" element={<ProtectedRoute require="donor"><DonorProfile /></ProtectedRoute>} />
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
    path="/BookAppointment"
    element={
      <ProtectedRoute require="donor" >
      <BookAppointment />
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
    path="/branch-admin"
    element={
      <ProtectedRoute require="staff" allowedRoles={['branch-admin']}>
      <BranchAdminLayout />
      </ProtectedRoute>
    }
    >
    <Route index element={<BranchDashboard />} />
    </Route>
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

    {/* ----- ADMIN ONLY ------ */}
    <Route
    path="/Request-admin"
    element={
      <ProtectedRoute require="staff" allowedRoles={['staff', 'supervisor', 'branch-admin', 'admin']}>
      <BloodRequestsAdmin />
      </ProtectedRoute>
    }
    />
    <Route
    path="/admin"
    element={
      <ProtectedRoute require="staff"  allowedRoles={['admin']}>
      <AdminLayout />
      </ProtectedRoute>
    }
    />
    <Route
    path="/admin/user-directory"
    element={
      <ProtectedRoute require="staff"  allowedRoles={['admin']}>
      <UserDirectoryPage />
      </ProtectedRoute>
    }
    />
    <Route
    path="/admin/provision-supervisor"
    element={
      <ProtectedRoute require="staff"  allowedRoles={['admin']}>
      <ProvisionSupervisorPage />
      </ProtectedRoute>
    }
    />
    <Route
    path="/admin/change-owner"
    element={
      <ProtectedRoute require="staff"  allowedRoles={['admin']}>
      <AdminChangeOwner />
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
