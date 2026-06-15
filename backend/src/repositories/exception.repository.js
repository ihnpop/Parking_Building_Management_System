const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class ExceptionRepository {
  /**
   * Fetch and filter incident logs with pagination (Manager Dashboard)
   */
  async getAll({ limit, offset, sortBy, sortOrder, filters }) {
    let query = supabase
      .from('exception_logs')
      .select(`
        *,
        parking_sessions (
          ticket_code,
          license_plate,
          check_in_time,
          check_out_time,
          vehicle_types (display_name)
        ),
        logged_by:profiles!staff_id (full_name),
        resolved_by_profile:profiles!resolved_by (full_name)
      `, { count: 'exact' });

    // Apply Filter Constraints
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.exception_type) query = query.eq('exception_type', filters.exception_type);
    if (filters.staff_id) query = query.eq('staff_id', filters.staff_id);

    // Apply pagination and sorting bounds
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);
    return { data, count };
  }

  /**
   * View details of an incident log
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('exception_logs')
      .select(`
        *,
        parking_sessions (
          *,
          slots (slot_code),
          vehicle_types (display_name)
        ),
        logged_by:profiles!staff_id (full_name),
        resolved_by_profile:profiles!resolved_by (full_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw new AppError('Incident log not found.', 404);
    return data;
  }

  /**
   * Log a new incident override
   */
  async create({ session_id, staff_id, exception_type, justification }) {
    const { data, error } = await supabase
      .from('exception_logs')
      .insert({
        session_id,
        staff_id,
        exception_type,
        justification,
        status: 'PENDING' // Defaults to pending audit
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Resolve an incident log with audit remarks
   */
  async resolve(id, { resolved_by, resolution_notes }) {
    const { data, error } = await supabase
      .from('exception_logs')
      .update({
        resolved_by,
        resolution_notes,
        status: 'RESOLVED',
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }
}

module.exports = new ExceptionRepository();
