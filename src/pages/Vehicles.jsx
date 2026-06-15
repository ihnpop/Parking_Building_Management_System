import React, { useState } from 'react';
import { Car, Plus, Info, Check } from 'lucide-react';

const Vehicles = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');

  const [vehicleTypes, setVehicleTypes] = useState([
    { id: 1, display_name: 'SEDAN / MOTORBIKE', desc: 'Standard small to medium length passenger vehicles' },
    { id: 2, display_name: 'SUV / TRUCK', desc: 'Large heavy-class vehicles, high clearance' },
    { id: 3, display_name: 'ELECTRIC VEHICLE', desc: 'Vehicles utilizing EV charging sockets' }
  ]);

  const handleAddType = (e) => {
    e.preventDefault();
    if (!typeName) return;

    setVehicleTypes(prev => [
      ...prev,
      { id: Date.now(), display_name: typeName.toUpperCase(), desc: description }
    ]);

    setSuccessMsg(`Vehicle class "${typeName.toUpperCase()}" registered.`);
    setShowAddModal(false);
    setTypeName('');
    setDescription('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vehicle Categories</h1>
          <p className="text-xs text-gray-500">Configure vehicle classes and maximum weight descriptions</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Vehicle Category</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid of vehicle classes */}
      <div className="grid gap-6 md:grid-cols-3">
        {vehicleTypes.map((v) => (
          <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] text-gray-400 font-mono">CODE: VEH-00{v.id}</span>
              <h3 className="text-sm font-bold text-gray-800 mt-0.5">{v.display_name}</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{v.desc || 'No descriptions configuration.'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Add Category</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VAN / MINIBUS"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Multi-seat passenger vehicles and vans under 3.5 tons"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white resize-none"
                />
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
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
