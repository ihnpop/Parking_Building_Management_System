import React, { useState } from 'react';
import { Calendar, Download, BarChart2, TrendingUp, DollarSign, Clock, Check } from 'lucide-react';

const Reports = () => {
  const [dateRange, setDateRange] = useState('30');
  const [successMsg, setSuccessMsg] = useState('');

  // Mock revenue statements list
  const mockRevenueList = [
    { date: '2026-06-15', totalSessions: 42, completedStays: 38, revenue: 310.00, methodCash: 120.00, methodBank: 190.00 },
    { date: '2026-06-14', totalSessions: 55, completedStays: 50, revenue: 420.00, methodCash: 180.00, methodBank: 240.00 },
    { date: '2026-06-13', totalSessions: 48, completedStays: 46, revenue: 380.00, methodCash: 140.00, methodBank: 240.00 }
  ];

  const handleExportCSV = () => {
    setSuccessMsg('Preparing report CSV download... Saved to downloads directory.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytics Reports</h1>
          <p className="text-xs text-gray-500">Audit daily financials, vehicle frequencies, and payment breakdown methods</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-150 p-4 text-xs font-semibold text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Average Stay Stay Time</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-800">4.2 Hours</h3>
            <span className="text-xs text-green-500 font-semibold flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+4%</span>
            </span>
          </div>
          <p className="text-[10px] text-gray-400">Average billing stay time across all vehicle categories</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Bank Transfer Ratio</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-800">62.8%</h3>
            <span className="text-xs text-gray-400 font-medium">Of total collected revenue</span>
          </div>
          <p className="text-[10px] text-gray-400">Percentage of payments processed via bank QR transfers</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Waivers Ratio</span>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-red-650">1.8%</h3>
            <span className="text-xs text-gray-400 font-medium">4 incident exceptions total</span>
          </div>
          <p className="text-[10px] text-gray-400">Incidents resolved with waived checkout fees (e.g. Lost Tickets)</p>
        </div>
      </div>

      {/* Roster list */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Daily Revenue Ledger</h3>
            <p className="text-[11px] text-gray-400">Financial summaries organized chronologically</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4">Date</th>
                <th className="p-4">Total Check-Ins</th>
                <th className="p-4">Completed Closures</th>
                <th className="p-4">Cash Payments</th>
                <th className="p-4">Bank Transfer Payments</th>
                <th className="p-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-600 divide-y divide-gray-50">
              {mockRevenueList.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="p-4 font-bold text-gray-800">{row.date}</td>
                  <td className="p-4">{row.totalSessions}</td>
                  <td className="p-4">{row.completedStays}</td>
                  <td className="p-4 text-gray-550">${row.methodCash.toFixed(2)}</td>
                  <td className="p-4 text-gray-550">${row.methodBank.toFixed(2)}</td>
                  <td className="p-4 text-right text-orange-600 font-bold">${row.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
