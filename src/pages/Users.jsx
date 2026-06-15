import React, { useState } from 'react';
import { UserPlus, Shield, Power, Mail, Check } from 'lucide-react';

const Users = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Add User Form state variables
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [password, setPassword] = useState('');

  // Mock roster of employees
  const mockUsers = [
    { id: 1, full_name: 'System Administrator', email: 'admin@pbms.io', role: 'ADMIN', is_active: true },
    { id: 2, full_name: 'Facility Manager', email: 'manager@pbms.io', role: 'MANAGER', is_active: true },
    { id: 3, full_name: 'Gate Operator', email: 'staff@pbms.io', role: 'STAFF', is_active: true }
  ];

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    setSuccessMsg(`User profile for ${fullName} (${role}) registered successfully!`);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setPassword('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users Roster</h1>
          <p className="text-xs text-gray-500">Manage operator accounts, credentials, and access roles</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Register User</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4">Name / ID</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role Clearance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600 divide-y divide-gray-50">
              {mockUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-50 text-orange-600 font-bold flex items-center justify-center text-xs">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{u.full_name}</p>
                        <span className="text-[10px] text-gray-400">ID: usr_00{u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-gray-500">{u.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[9px] font-semibold uppercase">
                      <Shield className="h-3 w-3" />
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-[10px] font-bold text-gray-400 hover:text-red-500">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Register New Employee</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@pbms.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="STAFF">STAFF (Operator)</option>
                    <option value="MANAGER">MANAGER (Audit)</option>
                    <option value="ADMIN">ADMIN (Full Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
