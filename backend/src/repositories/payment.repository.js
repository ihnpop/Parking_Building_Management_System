const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class PaymentRepository {
  /**
   * Search and list payment transactions with pagination, sorting, and filters (Manager auditing)
   */
  async getAll({ limit, offset, sortBy, sortOrder, filters }) {
    let query = supabase
      .from('payments')
      .select(`
        *,
        parking_sessions (
          ticket_code,
          license_plate,
          check_in_time,
          check_out_time,
          vehicle_types (display_name)
        )
      `, { count: 'exact' });

    // Filter Constraints Mapping
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.method) query = query.eq('method', filters.method);
    
    // Date Range Audits Filter
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // Apply sorting and pagination bounds
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    return { data, count };
  }

  /**
   * View details of a specific payment transaction
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        parking_sessions (
          *,
          slots (slot_code),
          vehicle_types (display_name),
          check_in_staff:profiles!check_in_staff_id (full_name),
          check_out_staff:profiles!check_out_staff_id (full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new AppError('Payment transaction record not found.', 404);
    return data;
  }

  /**
   * Insert a payment transaction
   */
  async create({ session_id, amount, status, method }) {
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

    if (error) {
      // 23505 is PostgreSQL error code for unique key violation (prevents duplicate payment records for same session)
      if (error.code === '23505') {
        throw new AppError('A payment record has already been recorded for this stay session.', 409);
      }
      throw new AppError(error.message, 400);
    }
    return data;
  }
}

module.exports = new PaymentRepository();
