import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import DashboardShell from './components/DashboardShell'
import './App.css'
import GeneralStatisticsTable from './components/Generalstatisticstable'
export default function App() {
  return (
    // <Routes>
    //   <Route path="/login" element={<LoginPage />} />
    //   <Route path="/login/dashboard/*" element={<DashboardShell />} />
    //   <Route path="*" element={<Navigate to="/login" replace />} />
    // </Routes>
    <><GeneralStatisticsTable /></>
  )
}
