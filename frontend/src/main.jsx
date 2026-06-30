import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { BrowserRouter } from 'react-router-dom'   thay thế thành
import { HashRouter } from "react-router-dom";
import { AuthProvider } from './context/AuthContext'

import './styles/index.css';
import './styles/App.css';
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <BrowserRouter> */}
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
    {/* </BrowserRouter> */}
  </StrictMode>,
)
