import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import DashboardView from './components/DashboardView'
import SystemOperations from './components/SystemOperations'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="main">
        <Topbar title={activeTab === 'system' ? 'ParkFlow Admin' : 'Bảng điều khiển'} showExtras={activeTab === 'system'} />

        <main className="content">
          {activeTab === 'system' ? <SystemOperations /> : <DashboardView />}
        </main>
      </div>
    </div>
  )
}
