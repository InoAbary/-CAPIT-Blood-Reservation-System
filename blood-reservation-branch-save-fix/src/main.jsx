import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { APIProvider, Map } from '@vis.gl/react-google-maps'

import './index.css'
import App from './App.jsx'



ReactDOM.createRoot(document.getElementById('root')).render(

  <React.StrictMode>
    <APIProvider apiKey={import.meta.env.VITE_GMAPS_API_KEY} >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </APIProvider>

  </React.StrictMode>

)