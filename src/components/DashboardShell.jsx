import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import DashboardView from './DashboardView'
import SystemOperations from './SystemOperations'

export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="main">
        <Topbar
          title={activeTab === 'system' ? 'ParkFlow Admin' : 'Bảng điều khiển'}
          showExtras={activeTab === 'system'}
        />

        <main className="content">
          {activeTab === 'system' ? <SystemOperations /> : <DashboardView />}
        </main>
      </div>
    </div>
  )
}
