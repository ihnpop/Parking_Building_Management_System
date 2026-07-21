import AppError from "../utils/AppError.js";
import supabase from "../config/supabaseClient.js";
import crypto from "crypto";



/**
 * Tạo một phiên gửi xe mới (check-in).
 * @param {object} payload
 * @param {string} payload.vehicle_id
 * @param {string} payload.plate_number
 * @param {string} payload.entry_vehicle_image  - public URL
 * @param {string} payload.entry_plate_image    - public URL
 * @param {string} [payload.staff_in_id]        - ID nhân viên check-in
 * @returns {Promise<object>}
 */
export const createParkingSession = async ({
  vehicle_id,
  plate_number,
  entry_vehicle_image,
  entry_plate_image,
  card_id,
  staff_in_id,
}) => {
  const { data, error } = await supabase
    .from("parking_sessions")
    .insert({
      session_id: crypto.randomUUID(),
      vehicle_id,
      plate_number,
      entry_vehicle_image,
      entry_plate_image,
      entry_time: new Date().toISOString(),
      status: "Đang gửi xe",
      card_id,
      staff_in_id: staff_in_id || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── Vehicle & Pricing ────────────────────────────────────────────────────────

/**
 * Tìm xe theo biển số để lấy vehicle_type_id.
 * @param {string} plateNumber
 * @returns {Promise<{vehicle_type_id: string}|null>}
 */
export const findVehicleByPlate = async (plateNumber) => {
  const { data, error } = await supabase
    .from("vehicle")
    .select("vehicle_type_id")
    .eq("plate_number", plateNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy danh sách price_item theo vehicle_type_id.
 * @param {string} vehicleTypeId
 * @returns {Promise<Array<{price: number, min_hour: number, max_hour: number}>>}
 */
export const findPriceItemsByVehicleType = async (vehicleTypeId) => {
  const { data, error } = await supabase
    .from("price_item")
    .select("price, min_hour, max_hour")
    .eq("vehicle_type_id", vehicleTypeId);

  if (error) throw new Error(error.message);
  return data ?? [];
};

// ─── openGateFree helpers ─────────────────────────────────────────────────────

/**
 * Lấy thông tin parking session theo session_id.
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
export const getSessionById = async (sessionId) => {
  const { data, error } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) throw new AppError("Không tìm thấy phiên gửi xe", 404);
  return data;
};

/**
 * Cập nhật parking session theo session_id (dùng cho openGateFree).
 * @param {string} sessionId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const updateSessionById = async (sessionId, payload) => {
  const { data, error } = await supabase
    .from("parking_sessions")
    .update(payload)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error) throw new Error("Lỗi cập nhật phiên gửi xe: " + error.message);
  return data;
};

/**
 * Tìm card_registration đang hoạt động theo card_id.
 * @param {string} cardId
 * @returns {Promise<{registration_id: string}|null>}
 */
export const findActiveCardRegistration = async (cardId) => {
  const { data, error } = await supabase
    .from("card_registrations")
    .select("registration_id")
    .eq("card_id", cardId)
    .eq("status", "Hoạt động")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Vô hiệu hóa card_registration.
 * @param {string} registrationId
 */
export const deactivateCardRegistration = async (registrationId) => {
  const { error } = await supabase
    .from("card_registrations")
    .update({ status: "Không hoạt động" })
    .eq("registration_id", registrationId);

  if (error) throw new Error(error.message);
};

/**
 * Đặt lại trạng thái thẻ về "Đang chờ".
 * @param {string} cardId
 */
export const resetCardStatus = async (cardId) => {
  const { error } = await supabase
    .from("card")
    .update({ status: "Đang chờ" })
    .eq("card_id", cardId);

  if (error) throw new Error(error.message);
};

/**
 * Lấy log xe vào theo session_id.
 * @param {string} sessionId
 * @returns {Promise<{building_id: string, parking_id: string, gate_id: string}|null>}
 */
export const getEntryLog = async (sessionId) => {
  const { data, error } = await supabase
    .from("entry_exit_log")
    .select("building_id, parking_id, gate_id")
    .eq("session_id", sessionId)
    .eq("direction", "Xe vào")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm cổng ra của parking.
 * @param {string} parkingId
 * @returns {Promise<string|null>} gate_id hoặc null
 */
export const findExitGate = async (parkingId) => {
  const { data, error } = await supabase
    .from("gate")
    .select("gate_id")
    .eq("parking_id", parkingId)
    .eq("gate_type", "Cổng ra")
    .limit(1);

  if (error) throw new Error(error.message);
  return data?.length > 0 ? data[0].gate_id : null;
};

/**
 * Ghi log xe ra vào entry_exit_log.
 * @param {object} payload
 */
export const insertExitLog = async (payload) => {
  const { error } = await supabase.from("entry_exit_log").insert(payload);
  if (error) throw new Error(error.message);
};

/**
 * Tìm phiên gửi xe đang hoạt động theo biển số xe.
 * @param {string} plateNumber
 * @returns {Promise<object|null>}
 */
export const findActiveSessionByPlate = async (plateNumber) => {
  const { data, error } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("plate_number", plateNumber)
    .in("status", ["Đang gửi xe", "Chờ thanh toán"])
    .order("entry_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật phiên gửi xe (check-out).
 * @param {string} sessionId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
export const updateParkingSession = async (sessionId, updateData) => {
  const { data, error } = await supabase
    .from("parking_sessions")
    .update(updateData)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
