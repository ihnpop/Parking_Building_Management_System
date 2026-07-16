import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from "react-router-dom";
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import supabase from './config/supabaseClient';

import './styles/index.css';
import './styles/App.css';
import App from './App.jsx'

<<<<<<< HEAD
if (window.location.hash && window.location.hash.includes("access_token=")) {
  setTimeout(() => {
    window.location.hash = "#/login/dashboard";
  }, 100);
}
=======
function MainApp() {
  const [isProcessingAuth, setIsProcessingAuth] = useState(() => {
    const hash = window.location.hash || "";
    // Only intercept if we have access_token (login flow) and are NOT on password recovery flows
    return hash.includes("access_token=") && 
           !hash.includes("set-password") && 
           !hash.includes("reset-password");
  });
>>>>>>> deploy-backup

  useEffect(() => {
    if (!isProcessingAuth) return;

    const checkAuth = async () => {
      try {
        // Wait for Supabase to extract and save the session from the URL hash
        const { data: { session } } = await supabase.auth.getSession();
        console.log("OAuth Session retrieved successfully:", session);
      } catch (err) {
        console.error("Error processing OAuth redirect:", err);
      } finally {
        // Change hash to the dashboard route and let the App render
        window.location.hash = "#/login/dashboard";
        setIsProcessingAuth(false);
      }
    };

    // Give Supabase a brief moment to process the hash parameters
    const timer = setTimeout(() => {
      checkAuth();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isProcessingAuth]);

  if (isProcessingAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="animate-spin" style={{
          width: '50px',
          height: '50px',
          border: '4px solid #3b82f6',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          marginBottom: '20px'
        }}></div>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Đang xử lý đăng nhập với Google...</h3>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>Vui lòng đợi trong giây lát</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}} />
      </div>
    );
  }

  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MainApp />
  </StrictMode>,
)

