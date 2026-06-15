const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class ReportRepository {
  /**
   * Fetch live slot counts and session records for KPI aggregates
   */
  async getLiveKPIStatus() {
    // 1) Fetch active sessions count
    const { count: activeCount, error: activeError } = await supabase
      .from('parking_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    if (activeError) throw new AppError(activeError.message, 500);

    // 2) Fetch pending incident logs count
    const { count: exceptionCount, error: exceptionError } = await supabase
      .from('exception_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (exceptionError) throw new AppError(exceptionError.message, 500);

    // 3) Fetch slots statuses count
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select('status');

    if (slotsError) throw new AppError(slotsError.message, 500);

    // 4) Fetch today's financial transactions (PAID status)
    const todayStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'PAID')
      .gte('created_at', todayStr);

    if (paymentsError) throw new AppError(paymentsError.message, 500);

    return {
      activeSessions: activeCount || 0,
      pendingExceptions: exceptionCount || 0,
      slotsRaw: slots,
      paymentsRaw: payments
    };
  }

  /**
   * Fetch payment logs within date limits
   */
  async getPaymentsInRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, method, created_at')
      .eq('status', 'PAID')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  /**
   * Fetch slots relational tree layouts
   */
  async getSlotsLayoutData() {
    const { data, error } = await supabase
      .from('slots')
      .select(`
        status,
        type,
        zones (
          name,
          floors (
            floor_name,
            buildings (
              name
            )
          )
        )
      `);

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  /**
   * Fetch session check-ins within date limits (for peak hours)
   */
  async getSessionsInRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('parking_sessions')
      .select('check_in_time, check_out_time, vehicle_types(display_name)')
      .gte('check_in_time', startDate)
      .lte('check_in_time', endDate);

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  /**
   * Fetch exceptions count within date limits
   */
  async getExceptionsInRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('exception_logs')
      .select('exception_type, status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw new AppError(error.message, 500);
    return data;
  }
}

module.exports = new ReportRepository();
