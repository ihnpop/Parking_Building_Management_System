import React, { useState } from 'react';
import { AlertOctagon, CheckSquare, MessageSquare, Check } from 'lucide-react';

const Exceptions = () => {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mock exception logs
  const [mockIncidents, setMockIncidents] = useState([
    { id: 1, type: 'LOST_TICKET', justification: 'Driver lost ticket. Verified identity card and license plate 30F-987.65.', status: 'PENDING', staff: 'Gate Operator', created_at: '2026-06-15T11:00:00Z' },
    { id: 2, type: 'PLATE_MISMATCH', justification: 'Scanner read 29A-123.45 at entry but read 29A-723.45 at exit. Confirmed manually.', status: 'PENDING', staff: 'Gate Operator', created_at: '2026-06-15T13:20:00Z' },
    { id: 3, type: 'MANUAL_OVERRIDE', justification: 'Sensor failure on Zone C gate arm. Forced barrier open.', status: 'RESOLVED', staff: 'Facility Manager', resolved_by: 'System Administrator', notes: 'Maintenance crew dispatched to replace induction loop sensor.', created_at: '2026-06-14T09:15:00Z' }
  ]);

  const handleResolveIncident = (e) => {
    e.preventDefault();
    if (!resolutionNotes) return;

    setMockIncidents(prev => prev.map(inc => {
      if (inc.id === selectedIncident.id) {
        return {
          ...inc,
          status: 'RESOLVED',
          resolved_by: 'Facility Manager',
          notes: resolutionNotes
        };
      }
      return inc;
    }));

    setSuccessMsg(`Incident #${selectedIncident.id} resolved successfully!`);
    setSelectedIncident(null);
    setResolutionNotes('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Incident Exception Logs</h1>
        <p className="text-xs text-gray-500">Audit manual barrier gate overrides, plate mismatch errors, and ticket loss waivers</p>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Incident List Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4">Incident Details</th>
                <th className="p-4">Logged By</th>
                <th className="p-4">Justification</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600 divide-y divide-gray-50">
              {mockIncidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        inc.status === 'PENDING' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        <AlertOctagon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{inc.type}</p>
                        <span className="text-[10px] text-gray-400">#INC-00{inc.id} • {new Date(inc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium">{inc.staff}</td>
                  <td className="p-4 max-w-xs truncate text-gray-500" title={inc.justification}>{inc.justification}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      inc.status === 'PENDING' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {inc.status === 'PENDING' ? (
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="text-[10px] font-bold text-orange-600 hover:underline"
                      >
                        Audit / Resolve
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-450 italic">Audited by {inc.resolved_by}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Audit Incident #INC-00{selectedIncident.id}</h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-red-50 p-4 border border-red-100 text-xs text-red-850 space-y-1.5">
              <p className="font-bold">Staff Justification Statement:</p>
              <p className="opacity-90">{selectedIncident.justification}</p>
            </div>

            <form onSubmit={handleResolveIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Resolution Audit Notes</label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Verified license plate match. Authorized waiver under supervisor review."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exceptions;
