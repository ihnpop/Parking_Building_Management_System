/**
 * paymentRepository.js
 * Lớp truy xuất cơ sở dữ liệu (Repository) cho thực thể Hóa đơn thanh toán (payment table).
 * Làm việc trực tiếp với Supabase Client để tạo mới, truy vấn, và cập nhật giao dịch.
 */

import supabase from "../config/supabaseClient.js";

// ─────────────────────────────────────────────
// PAYMENT TABLE
// ─────────────────────────────────────────────

/**
 * Thêm mới một bản ghi hóa đơn tạm (trạng thái 'Chờ thanh toán') vào bảng payment
 */
export async function create(data) {
    const { data: result, error } = await supabase
        .from("payment")
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

/**
 * Tìm kiếm chi tiết thông tin hóa đơn bằng mã đơn hàng duy nhất (order_code)
 */
export async function findByOrderCode(orderCode) {
    const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("order_code", orderCode)
        .single();
    if (error) throw error;
    return data;
}

/**
 * Cập nhật trạng thái và kết quả giao dịch thực tế sau khi nhận thông tin phản hồi từ cổng VNPay
 */
export async function updateStatus(orderCode, updates) {
    const { data, error } = await supabase
        .from("payment")
        .update(updates)
        .eq("order_code", orderCode)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * Kiểm tra xem một order_code đã tồn tại trong bảng payment chưa (dùng để tránh trùng lặp)
 */
export async function orderCodeExists(orderCode) {
    const { data } = await supabase
        .from("payment")
        .select("payment_id")
        .eq("order_code", orderCode)
        .maybeSingle();
    return !!data;
}

/**
 * Lấy trạng thái thanh toán (polling) theo order_code — chỉ SELECT, KHÔNG update
 */
export async function findStatusByOrderCode(orderCode) {
    const { data, error } = await supabase
        .from("payment")
        .select("payment_id, order_code, status, amount, payment_method, paid_at")
        .eq("order_code", orderCode)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

// ─────────────────────────────────────────────
// PARKING SESSIONS TABLE
// ─────────────────────────────────────────────

/**
 * Lấy thông tin chi tiết một lượt gửi xe bằng session_id
 */
export async function findSessionById(sessionId) {
    const { data, error } = await supabase
        .from("parking_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

/**
 * Cập nhật trạng thái phiên đỗ xe khi xe ra bãi (checkout)
 */
export async function updateSessionOnCheckout(sessionId, { exitTime, finalFee, staffOutId }) {
    const { error } = await supabase
        .from("parking_sessions")
        .update({
            exit_time: exitTime,
            status: "Hoàn thành",
            final_fee: finalFee,
            staff_out_id: staffOutId || null,
        })
        .eq("session_id", sessionId);
    if (error) throw new Error("Lỗi cập nhật phiên gửi xe: " + error.message);
}

/**
 * Cập nhật trạng thái phiên gửi xe (ví dụ: 'Chờ thanh toán')
 */
export async function updateSessionStatus(sessionId, status) {
    const { error } = await supabase
        .from("parking_sessions")
        .update({ status })
        .eq("session_id", sessionId);
    if (error) throw new Error("Lỗi cập nhật trạng thái phiên: " + error.message);
}

/**
 * Lấy card_id, vehicle_id, plate_number của một phiên gửi xe
 */
export async function findSessionSummary(sessionId) {
    const { data, error } = await supabase
        .from("parking_sessions")
        .select("card_id, vehicle_id, plate_number")
        .eq("session_id", sessionId)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

// ─────────────────────────────────────────────
// CARD & CARD_REGISTRATIONS TABLE
// ─────────────────────────────────────────────

/**
 * Giải phóng thẻ lượt vật lý sau khi xe ra bãi:
 * - Vô hiệu hóa card_registration đang hoạt động
 * - Reset trạng thái card về 'Đang chờ'
 */
export async function releaseCard(cardId) {
    // Hủy đăng ký thẻ đang hoạt động
    const { data: activeReg } = await supabase
        .from("card_registrations")
        .select("registration_id")
        .eq("card_id", cardId)
        .eq("status", "Hoạt động")
        .maybeSingle();

    if (activeReg) {
        await supabase
            .from("card_registrations")
            .update({ status: "Không hoạt động" })
            .eq("registration_id", activeReg.registration_id);
    }

    // Reset trạng thái thẻ vật lý về 'Đang chờ'
    await supabase
        .from("card")
        .update({ status: "Đang chờ" })
        .eq("card_id", cardId);
}

// ─────────────────────────────────────────────
// VEHICLE TABLE
// ─────────────────────────────────────────────

/**
 * Lấy vehicle_type_id của một xe
 */
export async function findVehicleTypeId(vehicleId) {
    const { data } = await supabase
        .from("vehicle")
        .select("vehicle_type_id")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();
    return data?.vehicle_type_id || null;
}

// ─────────────────────────────────────────────
// ENTRY_EXIT_LOG & GATE TABLE
// ─────────────────────────────────────────────

/**
 * Lấy building_id và parking_id từ log xe vào của một phiên
 */
export async function findEntryLog(sessionId) {
    const { data } = await supabase
        .from("entry_exit_log")
        .select("building_id, parking_id, gate_id")
        .eq("session_id", sessionId)
        .eq("direction", "Xe vào")
        .maybeSingle();
    return data;
}

/**
 * Tìm ID cổng ra phù hợp của một bãi xe.
 * Ưu tiên cổng loại 'Cổng ra', fallback về bất kỳ cổng nào.
 */
export async function findExitGate(parkingId) {
    // Ưu tiên cổng ra
    const { data: exitGates } = await supabase
        .from("gate")
        .select("gate_id")
        .eq("parking_id", parkingId)
        .eq("gate_type", "Cổng ra")
        .limit(1);

    if (exitGates?.length > 0) return exitGates[0].gate_id;

    // Fallback: bất kỳ cổng nào của bãi đó
    const { data: anyGates } = await supabase
        .from("gate")
        .select("gate_id")
        .eq("parking_id", parkingId)
        .limit(1);

    return anyGates?.length > 0 ? anyGates[0].gate_id : null;
}

/**
 * Ghi nhận nhật ký xe ra vào bảng entry_exit_log
 */
export async function insertExitLog({
    sessionId,
    vehicleId,
    cardId,
    buildingId,
    parkingId,
    gateId,
    staffId,
    exitTime,
    vehicleTypeId,
    plateNumber,
    ticketType,
    appliedPrice,
    note,
}) {
    const { error } = await supabase.from("entry_exit_log").insert({
        session_id: sessionId,
        vehicle_id: vehicleId,
        card_id: cardId || null,
        building_id: buildingId || null,
        parking_id: parkingId || null,
        gate_id: gateId || null,
        staff_id: staffId || null,
        direction: "Xe ra",
        event_time: exitTime,
        vehicle_type_id: vehicleTypeId || null,
        plate_number: plateNumber,
        ticket_type: ticketType,
        applied_price: appliedPrice,
        note,
    });
    if (error) throw new Error("Lỗi ghi entry_exit_log: " + error.message);
}