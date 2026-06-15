const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class SessionRepository {
  /**
   * Search and list sessions with pagination, sorting, and status filtering
   */
  async getAll({ limit, offset, sortBy, sortOrder, filters }) {
    let query = supabase
      .from('parking_sessions')
      .select(`
        *,
        slots (slot_code),
        vehicle_types (display_name),
        check_in_staff:profiles!check_in_staff_id (full_name),
        check_out_staff:profiles!check_out_staff_id (full_name)
      `, { count: 'exact' });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.vehicle_type_id) query = query.eq('vehicle_type_id', filters.vehicle_type_id);
    if (filters.license_plate) {
      query = query.ilike('license_plate', `%${filters.license_plate}%`);
    }
    if (filters.ticket_code) {
      query = query.eq('ticket_code', filters.ticket_code);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);
    return { data, count };
  }

  /**
   * Get session details by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('parking_sessions')
      .select(`
        *,
        slots (*),
        vehicle_types (*),
        check_in_staff:profiles!check_in_staff_id (*),
        check_out_staff:profiles!check_out_staff_id (*),
        payments (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new AppError('Session not found.', 404);
    return data;
  }

  /**
   * Get active session by ticket code or license plate
   */
  async getActiveByCodeOrPlate({ ticket_code, license_plate }) {
    let query = supabase
      .from('parking_sessions')
      .select('*')
      .eq('status', 'ACTIVE');

    if (ticket_code) {
      query = query.eq('ticket_code', ticket_code);
    } else if (license_plate) {
      query = query.eq('license_plate', license_plate);
    } else {
      throw new AppError('Must provide ticket code or license plate.', 400);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    
    // Return first element if found
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Create check-in session (requires slot lock)
   */
  async createSession({ slot_id, vehicle_type_id, ticket_code, license_plate, check_in_staff_id }) {
    const { data, error } = await supabase
      .from('parking_sessions')
      .insert({
        slot_id,
        vehicle_type_id,
        ticket_code,
        license_plate: license_plate.toUpperCase(),
        check_in_staff_id,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Close session on exit
   */
  async closeSession(id, { check_out_time, check_out_staff_id, status }) {
    const { data, error } = await supabase
      .from('parking_sessions')
      .update({
        check_out_time,
        check_out_staff_id,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Record transaction payment details
   */
  async recordPayment({ session_id, amount, status, method }) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        session_id,
        amount,
        status,
        method
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Record manual exception overrides
   */
  async logException({ session_id, staff_id, exception_type, justification }) {
    const { data, error } = await supabase
      .from('exception_logs')
      .insert({
        session_id,
        staff_id,
        exception_type,
        justification
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }
}

module.exports = new SessionRepository();
