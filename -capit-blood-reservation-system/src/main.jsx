import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'

import './index.css'
import App from './App.jsx'

const apiKey = import.meta.env.VITE_GMAPS_API_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {apiKey ? (
      <APIProvider apiKey={apiKey}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </APIProvider>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>
)
