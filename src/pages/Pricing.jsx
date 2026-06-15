import React, { useState } from 'react';
import { Plus, DollarSign, Clock, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

const Pricing = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // New pricing policy forms
  const [vehicleType, setVehicleType] = useState('SEDAN');
  const [basePrice, setBasePrice] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [gracePeriod, setGracePeriod] = useState('10');
  const [dayCap, setDayCap] = useState('');

  // Mock pricing rules
  const mockPolicies = [
    { id: 1, vehicle: 'SEDAN / MOTORBIKE', base_price: 2.00, hourly_rate: 1.00, grace: 10, cap: 12.00, is_active: true },
    { id: 2, vehicle: 'SUV / TRUCK', base_price: 5.00, hourly_rate: 3.00, grace: 15, cap: 30.00, is_active: true },
    { id: 3, vehicle: 'ELECTRIC VEHICLE', base_price: 3.00, hourly_rate: 1.50, grace: 15, cap: 20.00, is_active: true }
  ];

  const handleCreatePolicy = (e) => {
    e.preventDefault();
    if (!basePrice || !hourlyRate) return;

    setSuccessMsg(`New pricing rule created for ${vehicleType}! Historical versions deactivated automatically.`);
    setShowAddModal(false);
    setBasePrice('');
    setHourlyRate('');
    setGracePeriod('10');
    setDayCap('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tariff Configurations</h1>
          <p className="text-xs text-gray-500">Configure base rates, hourly rates, and free parking grace periods</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Tariff Policy</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Snapshot disclaimer warning */}
      <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 text-xs text-orange-800 flex gap-2">
        <AlertTriangle className="h-4.5 w-4.5 text-orange-500 shrink-0" />
        <div>
          <p className="font-bold">Temporal Pricing Policy Rule:</p>
          <p className="opacity-90 mt-0.5">
            Updating pricing rules does not modify existing active check-ins. Old check-ins will retain links to the exact pricing configuration snapshot that was active when they checked in.
          </p>
        </div>
      </div>

      {/* Rules list */}
      <div className="grid gap-6 md:grid-cols-3">
        {mockPolicies.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 relative overflow-hidden">
            <span className="absolute top-3 right-3 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider bg-green-100 text-green-800 uppercase">
              Active
            </span>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vehicle Type</span>
              <h3 className="text-sm font-bold text-gray-800 mt-0.5">{p.vehicle}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border-t border-dashed border-gray-150 pt-4">
              <div>
                <span className="text-gray-450 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Base (1st hour):</span>
                </span>
                <p className="font-bold text-gray-800 mt-1">${p.base_price.toFixed(2)}</p>
              </div>

              <div>
                <span className="text-gray-450 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Hourly rate:</span>
                </span>
                <p className="font-bold text-gray-800 mt-1">${p.hourly_rate.toFixed(2)}/hr</p>
              </div>

              <div>
                <span className="text-gray-450">Grace Period:</span>
                <p className="font-semibold text-gray-700 mt-0.5">{p.grace} minutes</p>
              </div>

              <div>
                <span className="text-gray-450">Day Cap:</span>
                <p className="font-semibold text-gray-700 mt-0.5">${p.cap.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Tariff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Add New Tariff Rules</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle Class</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  <option value="SEDAN">SEDAN / MOTORBIKE</option>
                  <option value="SUV">SUV / TRUCK</option>
                  <option value="ELECTRIC">ELECTRIC VEHICLE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5.00"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2.00"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Grace Period (min)</label>
                  <input
                    type="number"
                    required
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Day Cap ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 20.00"
                    value={dayCap}
                    onChange={(e) => setDayCap(e.target.value)}
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
                  Publish Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
