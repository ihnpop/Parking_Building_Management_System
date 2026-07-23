import supabase from "../config/supabaseClient.js";

/**
 * Tìm kiếm thông tin xe theo biển số xe (không phân biệt hoa thường)
 * @param {string} plateNumber 
 * @returns {Promise<object|null>}
 */
export const findByPlateNumber = async (plateNumber) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select(`
      *,
      customer(*),
      vehicle_type(*)
    `)
    .ilike('plate_number', plateNumber.trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo mới xe trong hệ thống (thường dùng cho khách vãng lai khi check-in)
 * @param {object} params
 * @param {string} params.plate_number
 * @param {string} params.vehicle_type_id
 * @returns {Promise<object>}
 */
export const createVehicle = async ({ plate_number, vehicle_type_id }) => {
  const { data, error } = await supabase
    .from('vehicle')
    .insert({
      plate_number: plate_number.trim().toUpperCase(),
      vehicle_type_id,
      status: 'Hoạt động'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm phiên gửi xe đang hoạt động của xe (hoặc biển số xe)
 * @param {string} vehicleId 
 * @param {string} plateNumber 
 * @returns {Promise<object|null>}
 */
export const findActiveSessionByVehicleOrPlate = async (vehicleId, plateNumber) => {
  let query = supabase
    .from('parking_sessions')
    .select('*')
    .eq('status', 'Đang gửi xe');

  if (vehicleId) {
    query = query.eq('vehicle_id', vehicleId);
  } else if (plateNumber) {
    query = query.ilike('plate_number', plateNumber.trim());
  } else {
    return null;
  }

  const { data, error } = await query
    .order('entry_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const updateVehicleType = async (vehicleId, vehicleTypeId) => {
  const { data, error } = await supabase
    .from('vehicle')
    .update({ vehicle_type_id: vehicleTypeId })
    .eq('vehicle_id', vehicleId)
    .select('*, vehicle_type(*)')
    .single();

  if (error) throw new Error(error.message);
  return data;
};
