import React, { useState } from 'react';
import { Building, Plus, Layers, Grid, MapPin, Check, PlusCircle } from 'lucide-react';

const Buildings = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);

  // Form states
  const [buildingName, setBuildingName] = useState('');
  const [floorName, setFloorName] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);

  // Mock initial layout tree data
  const [buildings, setBuildings] = useState([
    {
      id: 1,
      name: 'Building A (Main Terminal)',
      floors: [
        { id: 101, name: 'Floor 1 (Ground)', zones: [{ name: 'Zone North', slotsCount: 50 }, { name: 'Zone South', slotsCount: 50 }] },
        { id: 102, name: 'Floor 2 (Sub-level)', zones: [{ name: 'Zone EV Charging', slotsCount: 30 }] }
      ]
    },
    {
      id: 2,
      name: 'Building B (Annex Annex)',
      floors: [
        { id: 201, name: 'Floor 1', zones: [{ name: 'Zone West (Trucks)', slotsCount: 40 }] }
      ]
    }
  ]);

  const handleCreateBuilding = (e) => {
    e.preventDefault();
    if (!buildingName) return;

    const newBuilding = {
      id: Date.now(),
      name: buildingName,
      floors: []
    };

    setBuildings(prev => [...prev, newBuilding]);
    setSuccessMsg(`Parking Building "${buildingName}" added successfully.`);
    setShowAddBuildingModal(false);
    setBuildingName('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleCreateFloor = (e) => {
    e.preventDefault();
    if (!floorName || !selectedBuildingId) return;

    setBuildings(prev => prev.map(b => {
      if (b.id === selectedBuildingId) {
        return {
          ...b,
          floors: [
            ...b.floors,
            { id: Date.now(), name: floorName, zones: [] }
          ]
        };
      }
      return b;
    }));

    setSuccessMsg(`Floor "${floorName}" added successfully.`);
    setShowAddFloorModal(false);
    setFloorName('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Building Structures</h1>
          <p className="text-xs text-gray-500">Configure building boundaries, floor levels, and category zones</p>
        </div>

        <button
          onClick={() => setShowAddBuildingModal(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
        >
          <Building className="h-3.5 w-3.5" />
          <span>New Building</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Buildings tree mapping */}
      <div className="grid gap-8 lg:grid-cols-2">
        {buildings.map((b) => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Building className="h-4.5 w-4.5 text-orange-500" />
                <span>{b.name}</span>
              </h3>
              <button
                onClick={() => { setSelectedBuildingId(b.id); setShowAddFloorModal(true); }}
                className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add Floor</span>
              </button>
            </div>

            {b.floors.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No levels added yet. Click Add Floor to configure layout.</p>
            ) : (
              <div className="space-y-4">
                {b.floors.map((floor) => (
                  <div key={floor.id} className="rounded-xl border border-gray-150 bg-gray-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-gray-400" />
                      <span>{floor.name}</span>
                    </h4>

                    {floor.zones.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic pl-5">No zones inside this floor level.</p>
                    ) : (
                      <div className="grid gap-3 grid-cols-2 pl-5">
                        {floor.zones.map((zone, zIdx) => (
                          <div key={zIdx} className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-xs flex items-center gap-2">
                            <Grid className="h-3.5 w-3.5 text-orange-400" />
                            <div>
                              <p className="text-[10px] font-semibold text-gray-700">{zone.name}</p>
                              <span className="text-[9px] text-gray-400">{zone.slotsCount} Slots</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Building Modal */}
      {showAddBuildingModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Add Parking Building</h3>
              <button onClick={() => setShowAddBuildingModal(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateBuilding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Building Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Building C (East Wing)"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg">
                Create Building
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Floor Modal */}
      {showAddFloorModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Add Floor Level</h3>
              <button onClick={() => setShowAddFloorModal(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateFloor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Floor Level Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Floor 3"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg">
                Add Level
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buildings;
