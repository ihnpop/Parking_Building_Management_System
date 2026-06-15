const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class SlotRepository {
  /**
   * List slots with pagination, sorting, and multi-relational layout filtering
   */
  async getAll({ limit, offset, sortBy, sortOrder, filters }) {
    // Perform relational inner joins using Supabase syntax to filter slot trees
    let query = supabase
      .from('slots')
      .select(`
        id,
        slot_code,
        type,
        status,
        created_at,
        zone_id,
        zones!inner (
          id,
          name,
          floor_id,
          floors!inner (
            id,
            floor_number,
            floor_name,
            building_id,
            buildings!inner (
              id,
              name
            )
          )
        )
      `, { count: 'exact' });

    // Dynamic Filter Constraints Mapping
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.zone_id) query = query.eq('zone_id', filters.zone_id);
    
    // Deeper joins checks
    if (filters.floor_id) {
      query = query.eq('zones.floor_id', filters.floor_id);
    }
    if (filters.building_id) {
      query = query.eq('zones.floors.building_id', filters.building_id);
    }
    if (filters.search) {
      query = query.ilike('slot_code', `%${filters.search}%`);
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
   * View details of a specific slot
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('slots')
      .select(`
        id,
        slot_code,
        type,
        status,
        created_at,
        zones (
          id,
          name,
          floors (
            id,
            floor_number,
            floor_name,
            buildings (
              id,
              name
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new AppError('Slot record not found.', 404);
    return data;
  }

  /**
   * Create a new slot
   */
  async create({ zone_id, slot_code, type }) {
    const { data, error } = await supabase
      .from('slots')
      .insert({ zone_id, slot_code, type, status: 'AVAILABLE' })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Update slot configuration (code or category)
   */
  async update(id, { slot_code, type, zone_id }) {
    const { data, error } = await supabase
      .from('slots')
      .update({ slot_code, type, zone_id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Update slot status
   */
  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('slots')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Delete a slot
   */
  async delete(id) {
    // 1) Verify slot is not occupied before deletion
    const slot = await this.getById(id);
    if (slot.status === 'OCCUPIED') {
      throw new AppError('Cannot delete slot: A vehicle is currently occupying this spot.', 400);
    }

    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 400);
    return true;
  }
}

module.exports = new SlotRepository();
