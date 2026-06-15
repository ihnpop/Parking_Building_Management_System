import React, { useState } from 'react';
import { Shield, Check, Info, Lock, Save } from 'lucide-react';

const Roles = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // List of permissions in the system
  const permissionKeys = [
    { key: 'users_write', label: 'Manage Users & Credentials', description: 'Create, update, and deactivate employee accounts' },
    { key: 'pricing_write', label: 'Configure Tariffs & Pricing', description: 'Create and update hourly parking policy rates' },
    { key: 'exceptions_write', label: 'Resolve Incidents & Waivers', description: 'Audit and approve exceptions (e.g. Lost Tickets)' },
    { key: 'reports_read', label: 'View Financial Analytics', description: 'Access dashboard summary metrics, revenue, and usage logs' },
    { key: 'gate_operations', label: 'Barrier Gate Operations', description: 'Perform check-in entries, check-out calculations, and cash register' }
  ];

  // Role permissions allocation matrix
  const [matrix, setMatrix] = useState({
    ADMIN: ['users_write', 'pricing_write', 'exceptions_write', 'reports_read', 'gate_operations'],
    MANAGER: ['pricing_write', 'exceptions_write', 'reports_read', 'gate_operations'],
    STAFF: ['gate_operations']
  });

  const handleTogglePermission = (role, permission) => {
    // Admins are locked to prevent accidental lockouts
    if (role === 'ADMIN') return;

    setMatrix(prev => {
      const active = prev[role];
      const updated = active.includes(permission)
        ? active.filter(p => p !== permission)
        : [...active, permission];
      return { ...prev, [role]: updated };
    });
  };

  const handleSaveMatrix = async () => {
    setLoading(true);
    // Simulate API save payload
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSuccessMsg('Role permissions matrix saved and synced to database rules.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Role Permissions</h1>
          <p className="text-xs text-gray-500">Configure role-based access control rules for employee groups</p>
        </div>

        <button
          onClick={handleSaveMatrix}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{loading ? 'Saving Changes...' : 'Save Matrix'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* RLS Info Card */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800 flex gap-2">
        <Info className="h-4.5 w-4.5 text-blue-500 shrink-0" />
        <div>
          <p className="font-bold">Database Row-Level Security (RLS):</p>
          <p className="opacity-90 mt-0.5">
            Updating the permissions matrix dynamically enforces access barriers across frontend views. Database queries verify roles on API calls to reject unauthorized CRUD commands.
          </p>
        </div>
      </div>

      {/* Permissions Matrix Layout Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4 w-1/2">System Permission / Scope</th>
                {Object.keys(matrix).map(role => (
                  <th key={role} className="p-4 text-center">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600 divide-y divide-gray-50">
              {permissionKeys.map((perm) => (
                <tr key={perm.key} className="hover:bg-gray-50/50">
                  <td className="p-4 space-y-1">
                    <p className="font-semibold text-gray-800">{perm.label}</p>
                    <span className="text-[10px] text-gray-400 block">{perm.description}</span>
                  </td>
                  {Object.keys(matrix).map(role => {
                    const hasPerm = matrix[role].includes(perm.key);
                    const isAdmin = role === 'ADMIN';

                    return (
                      <td key={role} className="p-4 text-center">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            disabled={isAdmin}
                            onClick={() => handleTogglePermission(role, perm.key)}
                            className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                              hasPerm 
                                ? 'bg-orange-500 border-orange-500 text-white' 
                                : 'border-gray-200 hover:border-orange-500'
                            } ${isAdmin ? 'opacity-55 cursor-not-allowed bg-orange-100 border-orange-200 text-orange-700' : ''}`}
                          >
                            {hasPerm && (isAdmin ? <Lock className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />)}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Roles;
