import supabase from "../config/supabaseClient.js";

// ============================================================
// CARD — Queries
// ============================================================

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
 * Lấy danh sách thẻ theo loại (không bao gồm thẻ đã xóa)
 * @param {string} type - Loại thẻ (vd: 'Thẻ lượt')
 * @returns {Promise<object[]>}
 */
export const getCardsWithType = async (type) => {
  const { data, error } = await supabase
    .from('card')
    .select('card_id, code, type, expired_date, status, created_at')
    .eq('type', type)
    .not('status', 'eq', 'Đã xóa');

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy danh sách registrations kèm vehicle và customer theo danh sách card_id
 * @param {string[]} cardIds
 * @returns {Promise<object[]>}
 */
export const getRegistrationsByCardIds = async (cardIds) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      card_id,
      status,
      vehicle (
        vehicle_id,
        plate_number,
        customer (
          customer_id,
          full_name,
          phone,
          email
        )
      )
    `)
    .in('card_id', cardIds);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy phiên gửi xe mới nhất của một xe
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const getLatestSessionByVehicle = async (vehicleId) => {
  const { data } = await supabase
    .from('parking_sessions')
    .select('session_id, entry_time, exit_time')
    .eq('vehicle_id', vehicleId)
    .order('entry_time', { ascending: false })
    .limit(1);

  return data?.[0] || null;
};

/**
 * Lấy toàn bộ logs thanh toán kèm thông tin xe và khách hàng
 * @returns {Promise<object[]>}
 */
export const getPaymentLogs = async () => {
  const { data, error } = await supabase
    .from('payment')
    .select(`
      payment_time,
      amount,
      status,
      parking_order (
        vehicle (
          plate_number,
          customer (
            full_name
          )
        )
      )
    `);

  if (error) throw new Error(error.message);
  return data || [];
};

// ============================================================
// CARD — Mutations
// ============================================================

/**
 * Tìm thẻ đang chờ (status = 'Đang chờ') theo loại, ưu tiên thẻ cũ nhất
 * @param {string} type
 * @returns {Promise<object|null>}
 */
export const findWaitingCard = async (type) => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('type', type)
    .eq('status', 'Đang chờ')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tái sử dụng thẻ đang chờ: cập nhật status → Hoạt động và ngày tạo
 * @param {string} cardId
 * @param {string} startDate
 * @returns {Promise<object>}
 */
export const reuseWaitingCard = async (cardId, startDate) => {
  const { data, error } = await supabase
    .from('card')
    .update({
      status: 'Hoạt động',
      created_at: startDate || new Date().toISOString()
    })
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Kiểm tra mã code đã tồn tại chưa
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export const checkCodeExists = async (code) => {
  const { data } = await supabase
    .from('card')
    .select('code')
    .eq('code', code)
    .maybeSingle();
  return !!data;
};

/**
 * Tạo thẻ mới
 * @param {{ code: string, type: string, created_at: string, expired_date: string|null, status: string }} payload
 * @returns {Promise<object>}
 */
export const insertCard = async (payload) => {
  const { data, error } = await supabase
    .from('card')
    .insert(payload)
    .select()
    .single();

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
 * Xóa mềm thẻ (Soft Delete) — đổi status → Đã khóa
 * @param {string} cardId
 * @param {string} currentUserId
 * @returns {Promise<object>}
 */
export const softDelete = async (cardId, currentUserId) => {
  const { data, error } = await supabase
    .from('card')
    .update({
      status: 'Đã khóa',
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
 * Khóa thẻ (đổi status → Đã khóa) — dùng sau khi báo mất thẻ
 * @param {string} cardId
 * @returns {Promise<void>}
 */
export const lockCard = async (cardId) => {
  const { error } = await supabase
    .from('card')
    .update({ status: 'Đã khóa' })
    .eq('card_id', cardId);

  if (error) throw new Error(error.message);
};

/**
 * Mở khóa thẻ (đổi status → Hoạt động) — khi tìm lại được thẻ
 * @param {string} cardId
 * @returns {Promise<void>}
 */
export const unlockCard = async (cardId) => {
  const { error } = await supabase
    .from('card')
    .update({ status: 'Hoạt động' })
    .eq('card_id', cardId);

  if (error) throw new Error(error.message);
};

/**
 * Hủy thẻ vĩnh viễn (soft-delete với status → Đã xóa)
 * @param {string} cardId
 * @param {string} performedBy
 * @returns {Promise<void>}
 */
export const cancelCard = async (cardId, performedBy) => {
  const { error } = await supabase
    .from('card')
    .update({
      status: 'Đã xóa',
      deleted_at: new Date().toISOString(),
      deleted_by: performedBy
    })
    .eq('card_id', cardId);

  if (error) throw new Error(error.message);
};

/**
 * Lấy thông tin thẻ kèm type và status (dùng khi cần kiểm tra chi tiết)
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export const findCardTypeAndStatus = async (cardId) => {
  const { data, error } = await supabase
    .from('card')
    .select('type, status')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy toàn bộ thông tin thẻ theo card_id (dùng cho updateCard)
 * @param {string} cardId
 * @returns {Promise<object>}
 */
export const getCardById = async (cardId) => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', cardId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ============================================================
// VEHICLE — Queries & Mutations
// ============================================================

/**
 * Tìm xe theo biển số
 * @param {string} plate
 * @returns {Promise<object|null>}
 */
export const findVehicleByPlate = async (plate) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select('vehicle_id')
    .eq('plate_number', plate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm xe theo biển số (trả về toàn bộ fields)
 * @param {string} plate
 * @returns {Promise<object|null>}
 */
export const findVehicleByPlateAll = async (plate) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select('*')
    .eq('plate_number', plate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm xe theo vehicle_id
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findVehicleById = async (vehicleId) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select('plate_number')
    .eq('vehicle_id', vehicleId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo xe mới
 * @param {{ customer_id: string|null, vehicle_type_id: string, plate_number: string, status: string }} payload
 * @returns {Promise<object>}
 */
export const insertVehicle = async (payload) => {
  const { data, error } = await supabase
    .from('vehicle')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật biển số xe
 * @param {string} vehicleId
 * @param {string} plate
 * @returns {Promise<void>}
 */
export const updateVehiclePlate = async (vehicleId, plate) => {
  const { error } = await supabase
    .from('vehicle')
    .update({ plate_number: plate })
    .eq('vehicle_id', vehicleId);

  if (error) throw new Error(error.message);
};

/**
 * Cập nhật customer_id của xe (dùng khi báo mất thẻ lượt)
 * @param {string} vehicleId
 * @param {string|null} customerId
 * @returns {Promise<void>}
 */
export const updateVehicleCustomer = async (vehicleId, customerId) => {
  const { error } = await supabase
    .from('vehicle')
    .update({ customer_id: customerId })
    .eq('vehicle_id', vehicleId);

  if (error) {
    console.error('Lỗi khi cập nhật customer_id thành null cho thẻ lượt:', error.message);
  }
};

/**
 * Lấy loại xe đầu tiên trong hệ thống
 * @returns {Promise<string|null>} vehicle_type_id
 */
export const getFirstVehicleTypeId = async () => {
  const { data, error } = await supabase
    .from('vehicle_type')
    .select('vehicle_type_id')
    .limit(1);

  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0].vehicle_type_id : null;
};

// ============================================================
// CUSTOMER — Mutations
// ============================================================

/**
 * Tạo khách hàng mới
 * @param {{ full_name: string, phone: string|null, email: string|null, status: string }} payload
 * @returns {Promise<object>}
 */
export const insertCustomer = async (payload) => {
  const { data, error } = await supabase
    .from('customer')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ============================================================
// CARD REGISTRATIONS — Queries & Mutations
// ============================================================

/**
 * Tìm liên kết đăng ký đang hoạt động theo vehicle_id
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByVehicle = async (vehicleId) => {
  const { data: reg, error: regError } = await supabase
    .from('card_registrations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'Hoạt động')
    .maybeSingle();

  if (regError) throw new Error(regError.message);
  if (!reg) return null;

  const { data: card, error: cardError } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', reg.card_id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  reg.card = card;
  return reg;
};

/**
 * Tìm liên kết đăng ký đang hoạt động theo vehicle_id (hỗ trợ nhiều giá trị status)
 * Dùng cho checkout thẻ tháng
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByVehicleAny = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .in('status', ['ACTIVE', 'Hoạt động'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const reg = data && data.length > 0 ? data[0] : null;
  if (!reg) return null;

  const { data: card, error: cardError } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', reg.card_id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  reg.card = card;
  return reg;
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
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const reg = data && data.length > 0 ? data[0] : null;
  if (!reg) return null;

  const { data: card, error: cardError } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', reg.card_id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  reg.card = card;
  return reg;
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
 * Tìm registration Hoạt động theo card_id (chỉ lấy registration_id, vehicle_id)
 * Dùng cho updateCard
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByCardForUpdate = async (cardId) => {
  const { data } = await supabase
    .from('card_registrations')
    .select('registration_id, vehicle_id')
    .eq('card_id', cardId)
    .eq('status', 'Hoạt động')
    .maybeSingle();

  return data || null;
};

/**
 * Tìm registration Hoạt động theo vehicle_id (chỉ card_id và registration_id)
 * Dùng để kiểm tra biển số đã được sử dụng chưa
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveRegByVehicleId = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('registration_id, card_id, card(code)')
    .eq('vehicle_id', vehicleId)
    .in('status', ['Hoạt động'])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm registration Hoạt động theo vehicle_id (trả về toàn bộ fields)
 * Dùng trong updateCard khi kiểm tra biển số trùng
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveRegByVehicleIdAll = async (vehicleId) => {
  const { data } = await supabase
    .from('card_registrations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'Hoạt động')
    .maybeSingle();

  return data || null;
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
 * Tạo liên kết đăng ký mới với ngày bắt đầu tùy chỉnh
 * @param {{ card_id: string, vehicle_id: string, status: string, created_at: string }} payload
 * @returns {Promise<void>}
 */
export const insertCardRegistration = async (payload) => {
  const { error } = await supabase
    .from('card_registrations')
    .insert(payload);

  if (error) throw new Error(error.message);
};

/**
 * Xóa registration theo registration_id
 * @param {string} registrationId
 * @returns {Promise<void>}
 */
export const deleteRegistration = async (registrationId) => {
  const { error } = await supabase
    .from('card_registrations')
    .delete()
    .eq('registration_id', registrationId);

  if (error) throw new Error(error.message);
};

/**
 * Cập nhật vehicle_id cho một registration
 * @param {string} registrationId
 * @param {string} vehicleId
 * @returns {Promise<void>}
 */
export const updateRegistrationVehicle = async (registrationId, vehicleId) => {
  const { error } = await supabase
    .from('card_registrations')
    .update({ vehicle_id: vehicleId })
    .eq('registration_id', registrationId);

  if (error) throw new Error(error.message);
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


// ============================================================
// PARKING SESSIONS
// ============================================================

/**
 * Lấy phiên gửi xe mới nhất theo vehicle_id (trả về session_id)
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const getLatestSessionByVehicleId = async (vehicleId) => {
  const { data } = await supabase
    .from('parking_sessions')
    .select('session_id')
    .eq('vehicle_id', vehicleId)
    .order('entry_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
};

/**
 * Cập nhật thông tin phiên gửi xe
 * @param {string} sessionId
 * @param {{ plate_number: string, entry_time: string|null, exit_time: string|null }} payload
 * @returns {Promise<void>}
 */
export const updateParkingSession = async (sessionId, payload) => {
  const { error } = await supabase
    .from('parking_sessions')
    .update(payload)
    .eq('session_id', sessionId);

  if (error) throw new Error(error.message);
};
