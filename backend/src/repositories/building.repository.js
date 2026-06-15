const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class BuildingRepository {
  // === BUILDINGS ===
  async getAllBuildings() {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  async createBuilding({ name, address }) {
    const { data, error } = await supabase
      .from('buildings')
      .insert({ name, address })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  async updateBuilding(id, { name, address }) {
    const { data, error } = await supabase
      .from('buildings')
      .update({ name, address })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  // === FLOORS ===
  async getFloorsByBuilding(buildingId) {
    const { data, error } = await supabase
      .from('floors')
      .select('*')
      .eq('building_id', buildingId)
      .order('floor_number', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  async createFloor({ building_id, floor_number, floor_name }) {
    const { data, error } = await supabase
      .from('floors')
      .insert({ building_id, floor_number, floor_name })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  // === ZONES ===
  async getZonesByFloor(floorId) {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('floor_id', floorId)
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500);
    return data;
  }

  async createZone({ floor_id, name }) {
    const { data, error } = await supabase
      .from('zones')
      .insert({ floor_id, name })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }
}

module.exports = new BuildingRepository();
