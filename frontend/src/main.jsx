import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { BrowserRouter } from 'react-router-dom'   thay thế thành
import { HashRouter } from "react-router-dom";
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

import './styles/index.css';
import './styles/App.css';
import App from './App.jsx'

if (window.location.hash && window.location.hash.includes("access_token=")) {
  if (!window.location.hash.includes("set-password") && !window.location.hash.includes("reset-password")) {
    setTimeout(() => {
      window.location.hash = "#/login/dashboard";
    }, 100);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <BrowserRouter> */}
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
    {/* </BrowserRouter> */}
  </StrictMode>,
)
