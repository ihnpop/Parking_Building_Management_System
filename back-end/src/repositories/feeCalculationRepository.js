/**
 * feeCalculationRepository.js
 * Quản lý các truy vấn cơ sở dữ liệu liên quan đến phiên gửi xe, thông tin xe, thẻ,
 * log vào/ra và cấu hình bảng phí đỗ xe.
 */

import supabase from "../config/supabaseClient.js";

/**
 * Tìm phiên gửi xe đang hoạt động (Đang gửi xe hoặc Chờ thanh toán) của biển số xe
 * @param {string} cleanPlate
 * @returns {Promise<object|null>}
 */
export async function findActiveSession(cleanPlate) {
    const { data, error } = await supabase
        .from("parking_sessions")
        .select("*")
        .eq("plate_number", cleanPlate)
        .in("status", ["Đang gửi xe", "Chờ thanh toán"])
        .order("entry_time", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Tìm xe và loại xe theo vehicle_id
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export async function findVehicleById(vehicleId) {
    if (!vehicleId) return null;
    const { data, error } = await supabase
        .from("vehicle")
        .select("*, vehicle_type:vehicle_type_id(vehicle_type_id, name)")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Tìm xe và loại xe theo biển số (plate_number)
 * @param {string} plateNumber
 * @returns {Promise<object|null>}
 */
export async function findVehicleByPlate(plateNumber) {
    if (!plateNumber) return null;
    const cleanPlate = plateNumber.trim().toUpperCase();
    const { data, error } = await supabase
        .from("vehicle")
        .select("*, vehicle_type:vehicle_type_id(vehicle_type_id, name)")
        .eq("plate_number", cleanPlate)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}


/**
 * Tìm thẻ và gói vehicle_package hoạt động kèm theo card_id
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export async function findCardById(cardId) {
    const { data, error } = await supabase
        .from("card")
        .select("*, vehicle_package:active_vehicle_package_id(*)")
        .eq("card_id", cardId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Tìm thẻ tháng đang hoạt động qua đăng ký của xe (khi session không có card_id)
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export async function findActiveRegistrationByVehicleId(vehicleId) {
    const { data, error } = await supabase
        .from("card_registrations")
        .select("*, card:card_id(*, vehicle_package:active_vehicle_package_id(*))")
        .eq("vehicle_id", vehicleId)
        .eq("status", "Hoạt động")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Tìm gói xe (vehicle_package) đang hoạt động mới nhất theo vehicle_id
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export async function findActiveVehiclePackageByVehicleId(vehicleId) {
    if (!vehicleId) return null;
    const { data, error } = await supabase
        .from("vehicle_package")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("status", "Hoạt động")
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return null;
    return data;
}

/**
 * Kiểm tra xem xe có log báo mất thẻ nào chưa được xử lý không
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export async function findUnresolvedLostCardLog(vehicleId) {
    const { data, error } = await supabase
        .from("card_lost_log")
        .select("lost_report_id")
        .eq("vehicle_id", vehicleId)
        .neq("status", "Đã xử lý")
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Lấy parking_id nơi xe vào từ entry_exit_log
 * @param {string} sessionId
 * @returns {Promise<string|null>}
 */
export async function findEntryParkingId(sessionId) {
    const { data, error } = await supabase
        .from("entry_exit_log")
        .select("parking_id")
        .eq("session_id", sessionId)
        .eq("direction", "Xe vào")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data?.parking_id || null;
}

/**
 * Tìm bảng phí đang hoạt động của bãi đỗ xe
 * @param {string} parkingId
 * @returns {Promise<string|null>}
 */
export async function findActivePriceTableId(parkingId) {
    const { data, error } = await supabase
        .from("price_table")
        .select("price_table_id")
        .eq("parking_id", parkingId)
        .eq("status", "Hoạt động")
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data?.price_table_id || null;
}

/**
 * Lấy các dòng định mức giá trong bảng phí ứng với loại xe
 * @param {string} priceTableId
 * @param {string} vehicleTypeId
 * @returns {Promise<Array>}
 */
export async function findPriceItems(priceTableId, vehicleTypeId) {
    const { data, error } = await supabase
        .from("price_item")
        .select("*")
        .eq("price_table_id", priceTableId)
        .eq("vehicle_type_id", vehicleTypeId);

    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Lấy dòng định mức giá dự phòng (fallback) thẳng theo loại xe
 * @param {string} vehicleTypeId
 * @returns {Promise<Array>}
 */
export async function findPriceItemsByVehicleType(vehicleTypeId) {
    const { data, error } = await supabase
        .from("price_item")
        .select("*, price_table!inner(status)")
        .eq("vehicle_type_id", vehicleTypeId)
        .eq("price_table.status", "Hoạt động");

    if (error) throw new Error(error.message);
    return data || [];
}
