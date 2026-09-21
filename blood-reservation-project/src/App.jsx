import React, { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

import BloodBankMap from './pages/BloodBankMap'
function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
        <Route path="/BloodBankMap" element = {<BloodBankMap />} />
    </Routes>
  );
}

export default App
