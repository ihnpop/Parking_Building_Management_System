const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class VehicleRepository {
  async getAll() {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .order('code', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  async create({ code, display_name }) {
    const { data, error } = await supabase
      .from('vehicle_types')
      .insert({ code: code.toUpperCase(), display_name })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  async update(id, { code, display_name }) {
    const { data, error } = await supabase
      .from('vehicle_types')
      .update({ code: code ? code.toUpperCase() : undefined, display_name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  async delete(id) {
    const { error } = await supabase
      .from('vehicle_types')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 400);
    return true;
  }
}

module.exports = new VehicleRepository();
