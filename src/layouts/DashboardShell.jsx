import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardShell = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50/50">
      {/* Dynamic Nav Sidebar Column */}
      <Sidebar />

      {/* Main Core View Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar Header */}
        <Navbar />

        {/* Dynamic Nested Page Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
