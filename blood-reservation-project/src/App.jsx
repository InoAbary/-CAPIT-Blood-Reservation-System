import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import './i18n.cjs'

import Register from './pages/Register'
import Login from './pages/Login'

import BloodBankMap from './pages/BloodBankMap'
import Inventory from './pages/Inventory';
import Utilization from './pages/Utilization';
import BloodDonorForm from './pages/BloodDonorForm';
import FormDeny from './pages/FormDeny';
import FormPending from './pages/FormPending';
import BloodRequestForm from './pages/Bloodrequestform';
import BloodRequestsAdmin from './components/BloodRequestsAdmin';
import RegisterSuccess from './pages/RegisterSuccess';
import LoginSuccess from './pages/LoginSuccess';

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
        <Route path="/Register" element = {<Register />} />
        <Route path="/Register/Success" element = {<RegisterSuccess />} />
        <Route path="/Login/Success" element = {<LoginSuccess />} />
        <Route path="/Login" element = {<Login />} />
        <Route path="/BloodBankMap" element = {<BloodBankMap />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Utilization" element={<Utilization />} />
        <Route path="/BloodDonorForm" element={<BloodDonorForm />} />
        <Route path="/FormDeny" element={<FormDeny />} />
        <Route path="/FormPending" element={<FormPending />} />
        <Route path="/Request" element={<BloodRequestForm />}/>
        <Route path="/Request-admin" element={<BloodRequestsAdmin />} />

    </Routes>
    
  );
}


export default App
