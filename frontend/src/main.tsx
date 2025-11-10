import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import './global.css'
import App from './pages/App.tsx'
import Home from './pages/Home.tsx'
import Dashboard from './pages/Dashboard.tsx'
import { Navigate } from 'react-router-dom'
import PresentationMode from './pages/PresentationMode.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />}/>
          <Route path="/app" element={<App />}/>
          <Route path="/dashboard" element={<Dashboard />}/>
          <Route path="/presentation" element={<PresentationMode />}/>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  </StrictMode>,
)
