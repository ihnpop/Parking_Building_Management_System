import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  MonitorPlay, 
  Grid, 
  Users, 
  DollarSign, 
  AlertTriangle,
  Shield,
  Building,
  Car,
  BarChart2,
  Settings as SettingsIcon,
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { path: '/sessions', label: 'Gate Console', icon: MonitorPlay, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { path: '/slots', label: 'Slot Maps', icon: Grid, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { path: '/buildings', label: 'Buildings Layout', icon: Building, roles: ['ADMIN', 'MANAGER'] },
    { path: '/vehicles', label: 'Vehicle Classes', icon: Car, roles: ['ADMIN', 'MANAGER'] },
    { path: '/users', label: 'Users Roster', icon: Users, roles: ['ADMIN'] },
    { path: '/roles', label: 'Role Permissions', icon: Shield, roles: ['ADMIN'] },
    { path: '/pricing', label: 'Tariff Rules', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
    { path: '/exceptions', label: 'Exception Logs', icon: AlertTriangle, roles: ['ADMIN', 'MANAGER'] },
    { path: '/reports', label: 'Analytics Reports', icon: BarChart2, roles: ['ADMIN', 'MANAGER'] },
    { path: '/settings', label: 'System Settings', icon: SettingsIcon, roles: ['ADMIN'] }
  ];

  // Filter paths by matching roles
  const filteredMenu = menuItems.filter(item => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100 bg-gray-50/50">
        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-lg">P</div>
        <div>
          <h1 className="font-bold text-sm text-gray-800 tracking-tight leading-tight">PBMS Admin</h1>
          <span className="text-[10px] text-gray-400 font-medium">Internal Operations</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer User Block */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{user?.full_name}</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-800 uppercase mt-0.5">
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-150 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
