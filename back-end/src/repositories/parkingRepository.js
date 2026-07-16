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
