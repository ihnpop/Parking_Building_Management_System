import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, ShieldAlert, Cpu } from 'lucide-react';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Convert pathname to dynamic breadcrumb title
  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8">
      {/* Dynamic Title / Breadcrumb */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{getPageTitle()}</h2>
        <p className="text-[11px] text-gray-400">Manage internal building parking operations</p>
      </div>

      {/* Global Actions Block */}
      <div className="flex items-center gap-4">
        {/* System Diagnostic Status Indicator */}
        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-md text-[10px] font-semibold border border-green-100">
          <Cpu className="h-3 w-3 animate-pulse" />
          <span>Supabase Connected</span>
        </div>

        {/* Notifications Mock Button */}
        <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-orange-500"></span>
        </button>

        <div className="h-6 w-px bg-gray-200"></div>

        {/* Current Operator Profile Preview */}
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-700">{user?.full_name}</p>
          <span className="text-[9px] font-medium text-gray-400 uppercase">{user?.role}</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
