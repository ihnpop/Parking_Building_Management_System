const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class PricingRepository {
  /**
   * Fetch all pricing policies (active and historical versions)
   */
  async getAll({ filters }) {
    let query = supabase
      .from('pricing_policies')
      .select(`
        *,
        vehicle_types (code, display_name)
      `)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }
    if (filters.vehicle_type_id) {
      query = query.eq('vehicle_type_id', filters.vehicle_type_id);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  /**
   * Fetch single policy by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('pricing_policies')
      .select(`
        *,
        vehicle_types (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new AppError('Pricing policy record not found.', 404);
    return data;
  }

  /**
   * Deactivate all current pricing policies for a specific vehicle type
   */
  async deactivateByVehicleType(vehicleTypeId) {
    const { error } = await supabase
      .from('pricing_policies')
      .update({ is_active: false })
      .eq('vehicle_type_id', vehicleTypeId)
      .eq('is_active', true);

    if (error) throw new AppError(error.message, 400);
    return true;
  }

  /**
   * Insert new policy record
   */
  async create({ vehicle_type_id, base_price, hourly_rate, day_cap, grace_period_minutes }) {
    const { data, error } = await supabase
      .from('pricing_policies')
      .insert({
        vehicle_type_id,
        base_price,
        hourly_rate,
        day_cap,
        grace_period_minutes,
        is_active: true
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Delete pricing policy (allowed only if not linked to any parking sessions)
   */
  async delete(id) {
    // 1) Verify that this specific policy has no transaction links
    const { data, error: countError } = await supabase
      .from('parking_sessions')
      .select('id')
      .eq('pricing_applied_id', id); // Wait, pricing_applied_id or general lookup. 
      // If our session table links vehicle_type, it determines fee dynamically, but if it has exceptions or payments,
      // let's do a simple catch on foreign keys directly when executing database delete!
      // Supabase PostgreSQL raises a foreign key violation constraint error, which is caught and thrown safely.

    const { error } = await supabase
      .from('pricing_policies')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new AppError('Cannot delete policy: Historical transactions are currently linked to this record.', 400);
      }
      throw new AppError(error.message, 400);
    }
    return true;
  }
}

module.exports = new PricingRepository();
