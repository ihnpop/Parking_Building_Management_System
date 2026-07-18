import supabase from "../config/supabaseClient.js";

/**
 * Lấy một số biển số xe ngẫu nhiên từ DB (dùng để giả lập OCR)
 * @param {number} limit
 */
export const getRandomVehiclePlates = async (limit = 10) => {
  const { data } = await supabase
    .from('vehicle')
    .select('plate_number')
    .limit(limit);
  return data || [];
};

/**
 * Lấy danh sách thẻ lượt đang ở trạng thái 'Đang chờ' (cho xe vãng lai chọn)
 */
export const getAvailableVisitorCards = async () => {
  const { data, error } = await supabase
    .from('card')
    .select('card_id, code, type, status')
    .eq('type', 'Thẻ lượt')
    .eq('status', 'Đang chờ');
  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy danh sách gói cước của xe (vehicle_package)
 * @param {string} vehicleId
 */
export const getVehiclePackages = async (vehicleId) => {
  const { data } = await supabase
    .from('vehicle_package')
    .select('*')
    .eq('vehicle_id', vehicleId);
  return data || [];
};

/**
 * Lấy thông tin profile (building_id) của nhân viên
 * @param {string} staffId
 */
export const getStaffProfile = async (staffId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('building_id')
    .eq('id', staffId)
    .maybeSingle();
  return { profile: data, error };
};

/**
 * Lấy parking_id từ gate_id
 * @param {string} gateId
 */
export const getGateParkingId = async (gateId) => {
  const { data } = await supabase
    .from('gate')
    .select('parking_id')
    .eq('gate_id', gateId)
    .maybeSingle();
  return data || null;
};

/**
 * Lấy bãi đỗ xe đầu tiên thuộc tòa nhà
 * @param {string} buildingId
 */
export const getParkingByBuilding = async (buildingId) => {
  const { data } = await supabase
    .from('parking')
    .select('parking_id')
    .eq('building_id', buildingId)
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
};

/**
 * Lấy cổng đầu tiên của bãi đỗ xe
 * @param {string} parkingId
 */
export const getGateByParking = async (parkingId) => {
  const { data } = await supabase
    .from('gate')
    .select('gate_id')
    .eq('parking_id', parkingId)
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
};

/**
 * Tìm vehicle_type_id theo tên loại xe
 * @param {string} typeName
 */
export const getVehicleTypeId = async (typeName) => {
  const { data } = await supabase
    .from('vehicle_type')
    .select('vehicle_type_id')
    .or(`name.eq."${typeName}",name.eq."${typeName}"`)
    .limit(1);
  return data && data.length > 0 ? data[0].vehicle_type_id : null;
};

/**
 * Lấy loại xe đầu tiên trong DB (fallback)
 */
export const getFallbackVehicleTypeId = async () => {
  const { data } = await supabase
    .from('vehicle_type')
    .select('vehicle_type_id')
    .limit(1);
  return data && data.length > 0 ? data[0].vehicle_type_id : null;
};

/**
 * Lấy bảng giá theo loại xe
 * @param {string} vehicleTypeId
 */
export const getPriceItems = async (vehicleTypeId) => {
  const { data } = await supabase
    .from("price_item")
    .select("price, min_hour, max_hour")
    .eq("vehicle_type_id", vehicleTypeId);
  return data || [];
};

/**
 * Ghi nhật ký vào/ra (entry_exit_log)
 * @param {object} logData
 */
export const insertEntryExitLog = async (logData) => {
  const { error } = await supabase
    .from('entry_exit_log')
    .insert(logData);
  return error;
};

/**
 * Kiểm tra bản ghi payment đã tồn tại chưa
 * @param {string} sessionId
 * @param {string} paymentType
 */
export const checkExistingPayment = async (sessionId, paymentType = 'Vé lượt') => {
  const { data } = await supabase
    .from('payment')
    .select('payment_id')
    .eq('session_id', sessionId)
    .eq('payment_type', paymentType)
    .maybeSingle();
  return data;
};

/**
 * Chèn bản ghi thanh toán
 * @param {object} paymentData
 */
export const insertPayment = async (paymentData) => {
  const { error } = await supabase
    .from('payment')
    .insert(paymentData);
  return error;
};

/**
 * Đếm số xe đang trong bãi hiện tại (status = 'Đang gửi xe')
 */
export const countInsideVehicles = async () => {
  const { count, error } = await supabase
    .from("parking_sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "Đang gửi xe");
  if (error) throw new Error("Lỗi đếm số xe trong bãi: " + error.message);
  return count || 0;
};

/**
 * Đếm số xe trong bãi tại thời điểm cuối một ngày trong quá khứ
 * @param {Date} endOfDay
 */
export const countInsideVehiclesAtEnd = async (endOfDay) => {
  const { count, error } = await supabase
    .from("parking_sessions")
    .select("*", { count: "exact", head: true })
    .lt("entry_time", endOfDay.toISOString())
    .or(`exit_time.is.null,exit_time.gte.${endOfDay.toISOString()}`);
  if (error) throw new Error("Lỗi đếm số xe trong bãi: " + error.message);
  return count || 0;
};

/**
 * Đếm số xe đã vào trong khoảng thời gian
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 */
export const countVehiclesIn = async (startOfDay, endOfDay) => {
  const { count, error } = await supabase
    .from("parking_sessions")
    .select("*", { count: "exact", head: true })
    .gte("entry_time", startOfDay.toISOString())
    .lt("entry_time", endOfDay.toISOString());
  if (error) throw new Error("Lỗi đếm số xe đã vào: " + error.message);
  return count || 0;
};

/**
 * Đếm số xe đã ra trong khoảng thời gian
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 */
export const countVehiclesOut = async (startOfDay, endOfDay) => {
  const { count, error } = await supabase
    .from("parking_sessions")
    .select("*", { count: "exact", head: true })
    .gte("exit_time", startOfDay.toISOString())
    .lt("exit_time", endOfDay.toISOString());
  if (error) throw new Error("Lỗi đếm số xe đã ra: " + error.message);
  return count || 0;
};

/**
 * Lấy danh sách phiên gửi xe trong khoảng thời gian
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 */
export const getSessionsByDateRange = async (startOfDay, endOfDay) => {
  const { data, error } = await supabase
    .from("parking_sessions")
    .select(`
      session_id,
      vehicle_id,
      plate_number,
      entry_time,
      exit_time,
      status,
      card_id,
      final_fee
    `)
    .lt("entry_time", endOfDay.toISOString())
    .or(`exit_time.is.null,exit_time.gte.${startOfDay.toISOString()}`)
    .order("entry_time", { ascending: false });

  if (error) throw new Error("Lỗi lấy danh sách phiên gửi xe: " + error.message);
  return data || [];
};

/**
 * Lấy thông tin thẻ theo danh sách card_id
 * @param {string[]} cardIds
 */
export const getCardsByIds = async (cardIds) => {
  const { data, error } = await supabase
    .from("card")
    .select("card_id, code, type")
    .in("card_id", cardIds);
  if (error) {
    console.error("Lỗi lấy thông tin thẻ:", error.message);
    return [];
  }
  return data || [];
};
