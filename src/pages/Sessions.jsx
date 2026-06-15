import React, { useState } from 'react';
import { Play, LogOut, Search, Check, ShieldAlert, Key } from 'lucide-react';

const Sessions = () => {
  // Check-in state variables
  const [plateIn, setPlateIn] = useState('');
  const [vehicleType, setVehicleType] = useState('SEDAN');
  const [slotCode, setSlotCode] = useState('A-12');

  // Check-out search state
  const [ticketSearch, setTicketSearch] = useState('');
  const [checkoutDetail, setCheckoutDetail] = useState(null);

  // Success indicator message
  const [successMsg, setSuccessMsg] = useState('');

  const handleCheckIn = (e) => {
    e.preventDefault();
    if (!plateIn) return;

    // Simulate entry creation
    setSuccessMsg(`Gate barrier raised! Ticket printed for vehicle ${plateIn.toUpperCase()} at slot ${slotCode}.`);
    setPlateIn('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSearchCheckout = (e) => {
    e.preventDefault();
    if (!ticketSearch) return;

    // Simulate fee calculations
    setCheckoutDetail({
      ticket_code: ticketSearch.toUpperCase(),
      license_plate: '30F-987.65',
      check_in_time: '2026-06-15T10:15:00Z',
      check_out_time: new Date().toISOString(),
      elapsed_hours: 4,
      amount: 15.00
    });
  };

  const handleCompletePayment = (method) => {
    if (!checkoutDetail) return;
    setSuccessMsg(`Check-out completed! Billed $${checkoutDetail.amount}.00 via ${method}. Slot ${slotCode} released.`);
    setCheckoutDetail(null);
    setTicketSearch('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gate Console Operations</h1>
        <p className="text-xs text-gray-500">Record check-ins, verify checkout billing calculations, and manage gate barriers</p>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Check-In Column Panel */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-4 mb-6">
            <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Check-In Vehicle (Entry Gate)</h3>
              <p className="text-[10px] text-gray-400">Lock slot mapping and print barcode tickets</p>
            </div>
          </div>

          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">License Plate Number</label>
              <input
                type="text"
                required
                placeholder="e.g. 29A-123.45"
                value={plateIn}
                onChange={(e) => setPlateIn(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Vehicle Class</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  <option value="SEDAN">SEDAN / MOTORBIKE</option>
                  <option value="SUV">SUV / TRUCK</option>
                  <option value="ELECTRIC">ELECTRIC VEHICLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Assign Spot</label>
                <select
                  value={slotCode}
                  onChange={(e) => setSlotCode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  <option value="A-12">Slot A-12 (Regular)</option>
                  <option value="B-04">Slot B-04 (VIP)</option>
                  <option value="E-01">Slot E-01 (EV-Charging)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Verify & Check-In Entry</span>
            </button>
          </form>
        </div>

        {/* Check-Out Column Panel */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-gray-150 pb-4 mb-6">
              <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Check-Out Billing (Exit Gate)</h3>
                <p className="text-[10px] text-gray-400">Scan ticket barcodes and calculate fees</p>
              </div>
            </div>

            <form onSubmit={handleSearchCheckout} className="flex gap-2 mb-6">
              <input
                type="text"
                required
                placeholder="Scan ticket code or plate number..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Calculate Fee</span>
              </button>
            </form>

            {/* Calculations Card Panel */}
            {checkoutDetail && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-4">
                <div className="flex justify-between border-b border-gray-150 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">License Plate</p>
                    <h4 className="text-sm font-bold text-gray-800">{checkoutDetail.license_plate}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Ticket Code</p>
                    <span className="font-mono text-xs text-gray-500">{checkoutDetail.ticket_code}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <p className="font-semibold text-gray-700">{checkoutDetail.elapsed_hours} Hours</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Billed Fee:</span>
                    <p className="font-bold text-orange-600">${checkoutDetail.amount}.00</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-150">
                  <button
                    onClick={() => handleCompletePayment('CASH')}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Paid Cash</span>
                  </button>
                  <button
                    onClick={() => handleCompletePayment('BANK_TRANSFER')}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exception Incident Logging Form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="flex items-center gap-2 border-b border-gray-150 pb-4 mb-6">
          <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Report Operational Exception Incident</h3>
            <p className="text-[10px] text-gray-400">Log ticket losses or barrier bypasses for Manager/Admin audit review</p>
          </div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const ref = e.target.elements.exRef.value;
          const justification = e.target.elements.exJust.value;
          if (!ref || !justification) return;
          setSuccessMsg(`Incident reported! Created pending Exception request for "${ref}".`);
          e.target.reset();
          setTimeout(() => setSuccessMsg(''), 5500);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Incident Classification</label>
              <select
                name="exType"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white"
              >
                <option value="LOST_TICKET">LOST_TICKET (Fee Waiver Request)</option>
                <option value="PLATE_MISMATCH">PLATE_MISMATCH (Scanner Error Override)</option>
                <option value="MANUAL_OVERRIDE">MANUAL_OVERRIDE (Hardware Error Bypass)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reference Plate or Ticket Code</label>
              <input
                type="text"
                name="exRef"
                required
                placeholder="e.g. 30F-987.65"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Operator Justification Statement</label>
            <textarea
              name="exJust"
              required
              rows="2"
              placeholder="Provide exact details of verification check (e.g. verified ID card matching driver, sensor malfunctioning)..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white resize-none"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>Log Exception request</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Sessions;
