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
  if (!typeName) return null;
  const cleanName = typeName.trim();
  const { data } = await supabase
    .from('vehicle_type')
    .select('vehicle_type_id')
    .ilike('name', `%${cleanName}%`)
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
export const getPriceItems = async (vehicleTypeId, parkingId = null) => {
  let query = supabase
    .from("price_item")
    .select("price, min_hour, max_hour, price_table!inner(status, parking_id)")
    .eq("vehicle_type_id", vehicleTypeId)
    .eq("price_table.status", "Hoạt động");

  if (parkingId) {
    query = query.eq("price_table.parking_id", parkingId);
  }

  const { data } = await query;
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
 * @param {string|null} buildingId
 */
export const countInsideVehicles = async (buildingId = null) => {
  if (!buildingId) {
    const { count, error } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Đang gửi xe");
    if (error) throw new Error("Lỗi đếm số xe trong bãi: " + error.message);
    return count || 0;
  }

  // 1. Lấy các session_id có trong entry_exit_log thuộc building_id này
  const { data: logs, error: logErr } = await supabase
    .from("entry_exit_log")
    .select("session_id")
    .eq("building_id", buildingId)
    .eq("direction", "Xe vào");

  if (!logErr && logs && logs.length > 0) {
    const sessionIds = [...new Set(logs.map(l => l.session_id).filter(Boolean))];
    const { count, error } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Đang gửi xe")
      .in("session_id", sessionIds);

    if (!error) return count || 0;
  }

  // 2. Fallback thử join slot nếu không có log
  const { count, error } = await supabase
    .from("parking_sessions")
    .select("session_id, slot!inner(area!inner(floor!inner(parking!inner(building_id))))", { count: "exact", head: true })
    .eq("status", "Đang gửi xe")
    .eq("slot.area.floor.parking.building_id", buildingId);

  if (error) {
    console.warn("[gateRepository] countInsideVehicles fallback to 0 for building:", buildingId);
    return 0;
  }
  return count || 0;
};

/**
 * Đếm số xe trong bãi tại thời điểm cuối một ngày trong quá khứ
 * @param {Date} endOfDay
 * @param {string|null} buildingId
 */
export const countInsideVehiclesAtEnd = async (endOfDay, buildingId = null) => {
  if (!buildingId) {
    const { count, error } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .lt("entry_time", endOfDay.toISOString())
      .or(`exit_time.is.null,exit_time.gte.${endOfDay.toISOString()}`);
    if (error) throw new Error("Lỗi đếm số xe trong bãi: " + error.message);
    return count || 0;
  }

  const { data: logs } = await supabase
    .from("entry_exit_log")
    .select("session_id")
    .eq("building_id", buildingId)
    .eq("direction", "Xe vào");

  if (logs && logs.length > 0) {
    const sessionIds = [...new Set(logs.map(l => l.session_id).filter(Boolean))];
    const { count, error } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .in("session_id", sessionIds)
      .lt("entry_time", endOfDay.toISOString())
      .or(`exit_time.is.null,exit_time.gte.${endOfDay.toISOString()}`);

    if (!error) return count || 0;
  }

  return 0;
};

/**
 * Đếm số xe đã vào trong khoảng thời gian
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 * @param {string|null} buildingId
 */
export const countVehiclesIn = async (startOfDay, endOfDay, buildingId = null) => {
  if (!buildingId) {
    const { count, error } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .gte("entry_time", startOfDay.toISOString())
      .lt("entry_time", endOfDay.toISOString());
    if (error) throw new Error("Lỗi đếm số xe đã vào: " + error.message);
    return count || 0;
  }

  const { count, error } = await supabase
    .from("entry_exit_log")
    .select("*", { count: "exact", head: true })
    .eq("direction", "Xe vào")
    .eq("building_id", buildingId)
    .gte("event_time", startOfDay.toISOString())
    .lt("event_time", endOfDay.toISOString());

  if (error) {
    console.warn("[gateRepository] countVehiclesIn error for buildingId:", buildingId, error.message);
    return 0;
  }
  return count || 0;
};

/**
 * Đếm số xe đã ra trong khoảng thời gian
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 * @param {string|null} buildingId
 */
export const countVehiclesOut = async (startOfDay, endOfDay, buildingId = null) => {
  if (!buildingId) {
    const { count, error } = await supabase
      .from("parking_sessions")
      .select("*", { count: "exact", head: true })
      .gte("exit_time", startOfDay.toISOString())
      .lt("exit_time", endOfDay.toISOString());
    if (error) throw new Error("Lỗi đếm số xe đã ra: " + error.message);
    return count || 0;
  }

  const { count, error } = await supabase
    .from("entry_exit_log")
    .select("*", { count: "exact", head: true })
    .eq("direction", "Xe ra")
    .eq("building_id", buildingId)
    .gte("event_time", startOfDay.toISOString())
    .lt("event_time", endOfDay.toISOString());

  if (error) {
    console.warn("[gateRepository] countVehiclesOut error for buildingId:", buildingId, error.message);
    return 0;
  }
  return count || 0;
};

/**
 * Lấy danh sách phiên gửi xe trong khoảng thời gian
 * @param {Date} startOfDay
 * @param {Date} endOfDay
 * @param {string|null} buildingId
 */
export const getSessionsByDateRange = async (startOfDay, endOfDay, buildingId = null) => {
  if (!buildingId) {
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
  }

  const { data: logs } = await supabase
    .from("entry_exit_log")
    .select("session_id")
    .eq("building_id", buildingId);

  if (!logs || logs.length === 0) return [];

  const sessionIds = [...new Set(logs.map(l => l.session_id).filter(Boolean))];

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
    .in("session_id", sessionIds)
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
