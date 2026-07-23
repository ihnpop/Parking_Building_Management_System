import supabase from "../config/supabaseClient.js";

/**
 * Tìm vị trí đỗ (slot) còn trống ('Sẵn sàng'), cập nhật trạng thái thành 'Đang sử dụng'
 * Ưu tiên slot thuộc Area khớp với loại xe (vehicleTypeId).
 *
 * @param {object} params
 * @param {string} [params.vehicleTypeId] - ID loại xe (Ô tô, Xe máy...)
 * @param {string} [params.parkingId]     - ID bãi đỗ xe
 * @returns {Promise<{ slot_id: string, slot_code: string } | null>}
 */
export const findAndOccupyAvailableSlot = async ({ vehicleTypeId, parkingId } = {}) => {
  try {
    // 1. Tìm tất cả slot khả dụng ('Sẵn sàng') kèm thông tin area và floor
    const { data: availableSlots, error } = await supabase
      .from("slot")
      .select(`
        slot_id,
        slot_code,
        status,
        area:area_id (
          area_id,
          vehicle_type_id,
          status,
          floor:floor_id (
            floor_id,
            parking_id
          )
        )
      `)
      .eq("status", "Sẵn sàng");

    if (error) {
      console.error("[slotRepository] Lỗi truy vấn danh sách slot sẵn sàng:", error.message);
      return null;
    }

    if (!availableSlots || availableSlots.length === 0) {
      console.warn("[slotRepository] Không còn slot nào ở trạng thái 'Sẵn sàng'.");
      return null;
    }

    // 2. Lọc và ưu tiên slot:
    // Priority 1: Khớp vehicleTypeId và parkingId (nếu có)
    // Priority 2: Khớp vehicleTypeId
    // Priority 3: Khớp parkingId
    // Priority 4: Bất kỳ slot sẵn sàng nào
    let chosenSlot = availableSlots.find((s) => {
      const areaMatch = vehicleTypeId ? s.area?.vehicle_type_id === vehicleTypeId : true;
      const parkingMatch = parkingId ? s.area?.floor?.parking_id === parkingId : true;
      return areaMatch && parkingMatch;
    });

    if (!chosenSlot && vehicleTypeId) {
      chosenSlot = availableSlots.find((s) => s.area?.vehicle_type_id === vehicleTypeId);
    }

    if (!chosenSlot && parkingId) {
      chosenSlot = availableSlots.find((s) => s.area?.floor?.parking_id === parkingId);
    }

    if (!chosenSlot) {
      chosenSlot = availableSlots[0];
    }

    if (!chosenSlot) return null;

    // 3. Cập nhật trạng thái slot thành 'Đang dùng'
    const { error: updateErr } = await supabase
      .from("slot")
      .update({ status: "Đang dùng" })
      .eq("slot_id", chosenSlot.slot_id);

    if (updateErr) {
      console.error("[slotRepository] Lỗi cập nhật trạng thái slot:", updateErr.message);
      return null;
    }

    return {
      slot_id: chosenSlot.slot_id,
      slot_code: chosenSlot.slot_code
    };
  } catch (err) {
    console.error("[slotRepository] Lỗi ngoại lệ khi tìm/chiếm slot:", err.message);
    return null;
  }
};

/**
 * Giải phóng slot đỗ xe về trạng thái 'Sẵn sàng'
 *
 * @param {string} slotId
 * @returns {Promise<boolean>}
 */
export const releaseSlot = async (slotId) => {
  if (!slotId) return false;
  try {
    const { error } = await supabase
      .from("slot")
      .update({ status: "Sẵn sàng" })
      .eq("slot_id", slotId);

    if (error) {
      console.error(`[slotRepository] Lỗi giải phóng slot ${slotId}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[slotRepository] Lỗi ngoại lệ khi giải phóng slot ${slotId}:`, err.message);
    return false;
  }
};

/**
 * Ghi nhật ký cấp phát vị trí đỗ vào bảng slot_allocation_log
 *
 * @param {object} params
 * @param {string} params.sessionId
 * @param {string} params.suggestedSlotId
 * @param {string} params.actualSlotId
 * @param {string} params.vehicleTypeId
 * @param {string} [params.algorithmName]
 * @param {string} [params.reason]
 */
export const logSlotAllocation = async ({
  sessionId,
  suggestedSlotId,
  actualSlotId,
  vehicleTypeId,
  reason = "Tự động gán slot khi xe check-in"
}) => {
  if (!sessionId || !suggestedSlotId || !vehicleTypeId) return;
  try {
    await supabase.from("slot_allocation_log").insert({
      session_id: sessionId,
      suggested_slot_id: suggestedSlotId,
      actual_slot_id: actualSlotId || suggestedSlotId,
      vehicle_type_id: vehicleTypeId,
      reason
    });
  } catch (err) {
    console.warn("[slotRepository] Lỗi khi ghi slot_allocation_log:", err.message);
  }
};
