import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Check, RefreshCw, Key } from 'lucide-react';

const Settings = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states for system variables
  const [facilityName, setFacilityName] = useState('Central Plaza Parking');
  const [defaultGracePeriod, setDefaultGracePeriod] = useState('15');
  const [confidenceOCR, setConfidenceOCR] = useState('85');
  const [autoOpenGate, setAutoOpenGate] = useState(true);
  const [currency, setCurrency] = useState('USD');

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API submit configuration payload
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMsg('PBMS System settings updated and broadcasted to active gate terminals.');
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Configurations</h1>
          <p className="text-xs text-gray-500">Configure global parameters and hardware integrations</p>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="grid gap-8 lg:grid-cols-3">
        {/* Column 1: General Parameters */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">Facility Parameters</h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Building/Facility Identifier Name</label>
            <input
              type="text"
              required
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Grace Period (min)</label>
              <input
                type="number"
                required
                value={defaultGracePeriod}
                onChange={(e) => setDefaultGracePeriod(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
              >
                <option value="USD">USD ($)</option>
                <option value="VND">VND (đ)</option>
                <option value="SGD">SGD (S$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Column 2: Smart OCR Camera Parameters */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">OCR & Gate Automation</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">OCR Scanner Threshold confidence (%)</label>
            <input
              type="number"
              required
              min="50"
              max="100"
              value={confidenceOCR}
              onChange={(e) => setConfidenceOCR(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 mt-4">
            <div>
              <p className="text-xs font-semibold text-gray-700">Auto Gate Trigger</p>
              <span className="text-[9px] text-gray-400">Trigger loop barrier automatically on positive payment</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoOpenGate(!autoOpenGate)}
              className={`h-6 w-11 rounded-full p-0.5 transition-colors ${autoOpenGate ? 'bg-orange-500' : 'bg-gray-200'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${autoOpenGate ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>

        {/* Column 3: Maintenance & Credentials */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-3">Keys & Maintenance</h3>
            
            <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 text-xs text-orange-800 flex gap-2">
              <Key className="h-4.5 w-4.5 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold">Supabase Keys Status:</p>
                <p className="opacity-90 mt-0.5">
                  Server utilizes standard Service Role clearance credentials. DB constraints protect critical structures.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mt-6"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving Parameters...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
