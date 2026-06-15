import React from 'react';
import { 
  DollarSign, 
  Car, 
  Percent, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  // Mock data for initial presentation loading
  const stats = [
    { label: 'Total Revenue', value: '$2,450.00', change: '+12% from yesterday', icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Active Sessions', value: '84 Stays', change: 'Current occupancy capacity', icon: Car, color: 'text-orange-600 bg-orange-50' },
    { label: 'Occupancy Rate', value: '68.5%', change: '136/200 physical slots occupied', icon: Percent, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending Exceptions', value: '3 Logs', change: 'Requires manager resolution', icon: AlertTriangle, color: 'text-red-600 bg-red-50' }
  ];

  const recentTransactions = [
    { license_plate: '29A-123.45', type: 'SEDAN', slot: 'A-12', entry: '14:30', status: 'ACTIVE', fee: 'Calculating...' },
    { license_plate: '30F-987.65', type: 'SUV', slot: 'B-04', entry: '12:15', status: 'ACTIVE', fee: 'Calculating...' },
    { license_plate: '51G-555.55', type: 'ELECTRIC', slot: 'E-01', entry: '09:00', status: 'ACTIVE', fee: 'Calculating...' }
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic Welcome Heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Metrics</h1>
        <p className="text-xs text-gray-500">Live indicators of PBMS parking facility operations</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                <span className="text-[10px] font-medium text-gray-400">{stat.change}</span>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Grid Panel */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Column 1 & 2: Active Vehicles Stays */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Current Occupancy Stays</h3>
              <p className="text-[11px] text-gray-400">List of active vehicles currently inside building</p>
            </div>
            <span className="text-xs text-orange-500 font-medium cursor-pointer hover:underline">View all sessions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">License Plate</th>
                  <th className="pb-3">Slot Code</th>
                  <th className="pb-3">Entry Time</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Running Fee</th>
                </tr>
              </thead>
              <tbody className="text-xs text-gray-600 divide-y divide-gray-50">
                {recentTransactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3 font-semibold text-gray-800">{t.license_plate}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[10px] font-medium">
                        <MapPin className="h-3 w-3" />
                        <span>{t.slot}</span>
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{t.entry}</span>
                      </span>
                    </td>
                    <td className="py-3 font-medium uppercase text-[10px]">{t.type}</td>
                    <td className="py-3 text-right text-orange-600 font-semibold">{t.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: Peak Hours Utilization Bar Indicators */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800">Peak Occupancy Hours</h3>
            <p className="text-[11px] text-gray-400">Busiest arrival hours (daily average check-ins)</p>
          </div>

          <div className="space-y-4">
            {[
              { hour: '08:00 - 10:00 (Morning Rush)', percentage: 85, count: '45 check-ins', color: 'bg-orange-500' },
              { hour: '11:30 - 13:30 (Lunch Peak)', percentage: 70, count: '36 check-ins', color: 'bg-orange-400' },
              { hour: '17:00 - 19:00 (Evening Rush)', percentage: 95, count: '52 check-ins', color: 'bg-orange-600' }
            ].map((p, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                  <span>{p.hour}</span>
                  <span className="text-gray-400">{p.count}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
