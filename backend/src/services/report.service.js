const reportRepository = require('../repositories/report.repository');
const AppError = require('../utils/app-error');

class ReportService {
  /**
   * Aggregate live KPI summary stats
   */
  async getDashboardSummary() {
    const raw = await reportRepository.getLiveKPIStatus();

    // 1) Aggregate slot occupancy totals
    const totalSlots = raw.slotsRaw.length;
    const occupied = raw.slotsRaw.filter(s => s.status === 'OCCUPIED').length;
    const available = raw.slotsRaw.filter(s => s.status === 'AVAILABLE').length;
    const maintenance = raw.slotsRaw.filter(s => s.status === 'MAINTENANCE').length;

    const occupancyRate = totalSlots > 0 ? parseFloat(((occupied / totalSlots) * 100).toFixed(1)) : 0;

    // 2) Sum today's revenue collections
    const revenueToday = raw.paymentsRaw.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return {
      active_sessions: raw.activeSessions,
      pending_exceptions: raw.pendingExceptions,
      revenue_today: parseFloat(revenueToday.toFixed(2)),
      occupancy_rate: occupancyRate,
      slots_summary: {
        total: totalSlots,
        occupied,
        available,
        maintenance
      }
    };
  }

  /**
   * Aggregate daily revenue cash-flow aggregates
   */
  async getRevenueReport(startDate, endDate) {
    const dates = this.parseDateDefaults(startDate, endDate);
    const payments = await reportRepository.getPaymentsInRange(dates.start, dates.end);

    const dailyMap = {};
    let totalCollected = 0;
    const methodTotals = { CASH: 0, BANK_TRANSFER: 0 };

    payments.forEach(p => {
      const dateKey = new Date(p.created_at).toISOString().split('T')[0];
      const amt = parseFloat(p.amount);
      
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + amt;
      totalCollected += amt;
      
      if (methodTotals[p.method] !== undefined) {
        methodTotals[p.method] += amt;
      }
    });

    // Format map to sorted chart list array
    const chartData = Object.keys(dailyMap).sort().map(date => ({
      date,
      amount: parseFloat(dailyMap[date].toFixed(2))
    }));

    return {
      total_revenue: parseFloat(totalCollected.toFixed(2)),
      breakdown_by_method: methodTotals,
      chart_data: chartData
    };
  }

  /**
   * Group slot occupancy profiles by physical structures
   */
  async getOccupancyReport() {
    const slots = await reportRepository.getSlotsLayoutData();

    const buildingMap = {};

    slots.forEach(s => {
      // Safely navigate joins to retrieve building name
      const buildingName = s.zones?.floors?.buildings?.name || 'Unknown Building';
      
      if (!buildingMap[buildingName]) {
        buildingMap[buildingName] = { available: 0, occupied: 0, maintenance: 0, total: 0 };
      }

      const statusKey = s.status.toLowerCase();
      if (buildingMap[buildingName][statusKey] !== undefined) {
        buildingMap[buildingName][statusKey]++;
        buildingMap[buildingName].total++;
      }
    });

    const chartData = Object.keys(buildingMap).map(building => ({
      building,
      ...buildingMap[building]
    }));

    return {
      buildings_summary: chartData
    };
  }

  /**
   * Aggregate check-in check-out frequencies by hour of day (0-23)
   */
  async getPeakHoursReport(startDate, endDate) {
    const dates = this.parseDateDefaults(startDate, endDate);
    const sessions = await reportRepository.getSessionsInRange(dates.start, dates.end);

    // Initialize hourly array slots (0 to 23)
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      check_in_count: 0
    }));

    sessions.forEach(s => {
      if (s.check_in_time) {
        const hour = new Date(s.check_in_time).getHours();
        hourlyDistribution[hour].check_in_count++;
      }
    });

    return {
      hourly_activity: hourlyDistribution
    };
  }

  /**
   * Sum incident override frequencies by type
   */
  async getExceptionsReport(startDate, endDate) {
    const dates = this.parseDateDefaults(startDate, endDate);
    const logs = await reportRepository.getExceptionsInRange(dates.start, dates.end);

    const typeMap = {};
    let pendingCount = 0;
    let resolvedCount = 0;

    logs.forEach(l => {
      typeMap[l.exception_type] = (typeMap[l.exception_type] || 0) + 1;
      if (l.status === 'PENDING') pendingCount++;
      if (l.status === 'RESOLVED') resolvedCount++;
    });

    const chartData = Object.keys(typeMap).map(type => ({
      exception_type: type,
      count: typeMap[type]
    }));

    return {
      status_summary: {
        total: logs.length,
        pending: pendingCount,
        resolved: resolvedCount
      },
      chart_data: chartData
    };
  }

  // === HELPERS ===
  parseDateDefaults(startDate, endDate) {
    let start = startDate;
    let end = endDate;

    if (!start) {
      // Default to 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      start = thirtyDaysAgo.toISOString();
    }
    if (!end) {
      end = new Date().toISOString();
    }

    return { start, end };
  }
}

module.exports = new ReportService();
