import supabase from "../config/supabaseClient.js";

/**
 * Tìm kiếm thông tin thẻ theo card_id
 * @param {string} cardId 
 * @returns {Promise<object|null>}
 */
export const findById = async (cardId) => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Xóa mềm thẻ (Soft Delete)
 * @param {string} cardId 
 * @param {string} currentUserId 
 * @returns {Promise<object>}
 */
export const softDelete = async (cardId, currentUserId) => {
  const { data, error } = await supabase
    .from('card')
    .update({
      status: 'Đã xóa',
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId || null
    })
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm kiếm thông tin thẻ theo mã code
 * @param {string} code 
 * @returns {Promise<object|null>}
 */
export const findByCode = async (code) => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật trạng thái của thẻ
 * @param {string} cardId 
 * @param {string} status 
 * @returns {Promise<object>}
 */
export const updateStatus = async (cardId, status) => {
  const { data, error } = await supabase
    .from('card')
    .update({ status })
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm liên kết đăng ký đang hoạt động theo vehicle_id
 * @param {string} vehicleId 
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('*, card(*)')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'Hoạt động')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm liên kết đăng ký đang hoạt động theo vehicle_id (hỗ trợ nhiều giá trị status)
 * Dùng cho checkout thẻ tháng (registration có thể có status 'ACTIVE' hoặc 'Hoạt động')
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByVehicleAny = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('*, card(*)')
    .eq('vehicle_id', vehicleId)
    .in('status', ['ACTIVE', 'Hoạt động'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0] : null;
};

/**
 * Tìm registration mới nhất của xe (bất kể status)
 * Dùng để tái kích hoạt thẻ tháng khi xe vào lại sau checkout
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findLatestRegistrationByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('*, card(*)')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0] : null;
};

/**
 * Tái kích hoạt registration (đổi status về 'Hoạt động')
 * @param {string} registrationId
 * @returns {Promise<object>}
 */
export const reactivateRegistration = async (registrationId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .update({ status: 'Hoạt động' })
    .eq('registration_id', registrationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm liên kết đăng ký đang hoạt động theo card_id
 * @param {string} cardId 
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByCard = async (cardId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('*, vehicle(*)')
    .eq('card_id', cardId)
    .eq('status', 'Hoạt động')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo liên kết đăng ký mới giữa xe và thẻ
 * @param {string} cardId 
 * @param {string} vehicleId 
 * @param {string} status 
 * @returns {Promise<object>}
 */
export const createRegistration = async (cardId, vehicleId, status = 'Hoạt động') => {
  const { data, error } = await supabase
    .from('card_registrations')
    .insert({
      card_id: cardId,
      vehicle_id: vehicleId,
      status,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Hủy kích hoạt liên kết thẻ (khi check-out)
 * @param {string} registrationId 
 * @returns {Promise<object>}
 */
export const deactivateRegistration = async (registrationId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .update({ status: 'Đang chờ' })
    .eq('registration_id', registrationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
