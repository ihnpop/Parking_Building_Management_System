import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, HelpCircle, MapPin } from 'lucide-react';

const Slots = () => {
  const [selectedBuilding, setSelectedBuilding] = useState('Building A');
  const [selectedFloor, setSelectedFloor] = useState('Floor 1');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);

  // Mock list of slots for representation
  const mockSlots = [
    { id: 1, slot_code: 'A-01', type: 'REGULAR', status: 'AVAILABLE', zone: 'Zone North' },
    { id: 2, slot_code: 'A-02', type: 'REGULAR', status: 'OCCUPIED', zone: 'Zone North', plate: '30F-987.65' },
    { id: 3, slot_code: 'A-03', type: 'ELECTRIC', status: 'AVAILABLE', zone: 'Zone North' },
    { id: 4, slot_code: 'A-04', type: 'VIP', status: 'MAINTENANCE', zone: 'Zone South' },
    { id: 5, slot_code: 'A-05', type: 'LARGE', status: 'OCCUPIED', zone: 'Zone South', plate: '29A-123.45' },
    { id: 6, slot_code: 'A-06', type: 'REGULAR', status: 'AVAILABLE', zone: 'Zone South' }
  ];

  // Filtering logs
  const filteredSlots = mockSlots.filter(s => {
    if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Slots Layout Grid</h1>
          <p className="text-xs text-gray-500">Live monitoring of physical parking slot allocations</p>
        </div>

        {/* Filter Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="Building A">Building A</option>
            <option value="Building B">Building B</option>
          </select>

          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="Floor 1">Floor 1 (Ground)</option>
            <option value="Floor 2">Floor 2 (Sub-level)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {filteredSlots.map((slot) => {
          let statusStyle = 'border-green-200 bg-green-50/50 hover:bg-green-50 text-green-700';
          let badgeColor = 'bg-green-100 text-green-800';

          if (slot.status === 'OCCUPIED') {
            statusStyle = 'border-orange-200 bg-orange-50/50 hover:bg-orange-50 text-orange-700';
            badgeColor = 'bg-orange-100 text-orange-800';
          } else if (slot.status === 'MAINTENANCE') {
            statusStyle = 'border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700';
            badgeColor = 'bg-red-100 text-red-800';
          }

          return (
            <div
              key={slot.id}
              onClick={() => setSelectedSlotDetail(slot)}
              className={`border rounded-xl p-4 text-center cursor-pointer transition-all shadow-sm ${statusStyle}`}
            >
              <span className="text-[10px] font-bold tracking-wider block uppercase opacity-65 mb-1">{slot.type}</span>
              <h3 className="text-xl font-bold tracking-tight mb-2">{slot.slot_code}</h3>
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${badgeColor}`}>
                {slot.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Slot Detailed modal popups */}
      {selectedSlotDetail && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span>Slot details ({selectedSlotDetail.slot_code})</span>
              </h3>
              <button
                onClick={() => setSelectedSlotDetail(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Section:</span>
                <span className="font-semibold text-gray-700">{selectedSlotDetail.zone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Class:</span>
                <span className="font-semibold text-gray-700 uppercase">{selectedSlotDetail.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="font-semibold text-gray-700 uppercase">{selectedSlotDetail.status}</span>
              </div>
              {selectedSlotDetail.plate && (
                <div className="flex justify-between border-t border-dashed border-gray-150 pt-2">
                  <span className="text-gray-400">Current Occupant:</span>
                  <span className="font-bold text-orange-600">{selectedSlotDetail.plate}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedSlotDetail(null)}
              className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Slots;
