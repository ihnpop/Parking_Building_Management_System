/**
 * feeCalculation.service.js
 * Service tính phí gửi xe và kiểm tra điều kiện cho xe ra.
 * Được dùng chung bởi: thanh toán tiền mặt, tạo giao dịch VNPay, và endpoint check-exit.
 *
 * Business rules: BR-TT-01 → BR-TT-05
 */

import supabase from "../config/supabaseClient.js";

/**
 * Tính phí và kiểm tra điều kiện cho xe ra khỏi bãi.
 *
 * @param {string} plate_number - Biển số xe (sẽ tự uppercase)
 * @returns {Promise<{
 *   session: object,
 *   vehicle: object,
 *   card: object|null,
 *   is_monthly_valid: boolean,
 *   estimated_fee: number,
 *   fee_breakdown: {hours: number, price_item_used: object|null, rate: number} | null,
 *   ticket_type: 'Thẻ tháng'|'Thẻ lượt'|'Mất thẻ',
 *   warning: string|null
 * }>}
 */
export async function calculateExitFee({ plate_number }) {
    if (!plate_number || !plate_number.trim()) {
        const err = new Error("Biển số xe là bắt buộc.");
        err.statusCode = 400;
        throw err;
    }

    const cleanPlate = plate_number.trim().toUpperCase();

    // ─── 1. Tìm phiên gửi xe đang mở ────────────────────────────────────────
    const { data: session, error: sessionErr } = await supabase
        .from("parking_sessions")
        .select("*")
        .eq("plate_number", cleanPlate)
        .eq("status", "Đang gửi xe")
        .maybeSingle();

    if (sessionErr) throw new Error(sessionErr.message);
    if (!session) {
        const err = new Error(`Không tìm thấy phiên gửi xe đang mở cho xe ${cleanPlate}.`);
        err.statusCode = 404;
        throw err;
    }

    // ─── 2. Tìm thông tin xe ─────────────────────────────────────────────────
    const { data: vehicle, error: vehicleErr } = await supabase
        .from("vehicle")
        .select("*, vehicle_type:vehicle_type_id(vehicle_type_id, name)")
        .eq("vehicle_id", session.vehicle_id)
        .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);

    // ─── 3. Tìm thẻ gắn với phiên ────────────────────────────────────────────
    let card = null;
    if (session.card_id) {
        const { data: cardData } = await supabase
            .from("card")
            .select("*, vehicle_package:active_vehicle_package_id(*)")
            .eq("card_id", session.card_id)
            .maybeSingle();
        card = cardData;
    }

    // Fallback: tìm qua card_registrations nếu không có card_id trong session
    if (!card && vehicle) {
        const { data: reg } = await supabase
            .from("card_registrations")
            .select("*, card:card_id(*, vehicle_package:active_vehicle_package_id(*))")
            .eq("vehicle_id", vehicle.vehicle_id)
            .eq("status", "Hoạt động")
            .maybeSingle();
        if (reg?.card) card = reg.card;
    }

    // ─── 4. Kiểm tra thẻ mất ─────────────────────────────────────────────────
    let isLostCard = false;
    if (card?.status === "Mất thẻ") {
        isLostCard = true;
    } else if (vehicle) {
        // Kiểm tra card_lost_log chưa resolved
        const { data: lostLog } = await supabase
            .from("card_lost_log")
            .select("lost_report_id")
            .eq("vehicle_id", vehicle.vehicle_id)
            .neq("status", "Đã xử lý")
            .limit(1)
            .maybeSingle();
        if (lostLog) isLostCard = true;
    }

    if (isLostCard) {
        return {
            session,
            vehicle,
            card,
            is_monthly_valid: false,
            estimated_fee: 0, // Fee sẽ được tính riêng theo quy trình mất thẻ
            fee_breakdown: null,
            ticket_type: "Mất thẻ",
            warning: null,
        };
    }

    // ─── 5. Kiểm tra vehicle_package còn hạn ─────────────────────────────────
    const today = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'
    const vehiclePackage = card?.vehicle_package ?? null;

    const isMonthlyValid =
        vehiclePackage !== null &&
        vehiclePackage.status === "Hoạt động" &&
        vehiclePackage.end_date >= today;

    const isMonthlyExpired =
        vehiclePackage !== null &&
        (vehiclePackage.end_date < today || vehiclePackage.status !== "Hoạt động");

    // ─── 6. Thẻ tháng còn hạn → miễn phí ────────────────────────────────────
    if (isMonthlyValid) {
        return {
            session,
            vehicle,
            card,
            is_monthly_valid: true,
            estimated_fee: 0,
            fee_breakdown: null,
            ticket_type: "Thẻ tháng",
            warning: null,
        };
    }

    // ─── 7. Tính phí theo price_item ─────────────────────────────────────────
    let entryTimeStr = session.entry_time;
    if (
        typeof entryTimeStr === "string" &&
        !entryTimeStr.endsWith("Z") &&
        !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)
    ) {
        entryTimeStr += "Z";
    }
    const entryTime = new Date(entryTimeStr);
    const nowTime = new Date();
    const diffMs = nowTime.getTime() - entryTime.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    const billableHours = Math.max(1, Math.ceil(totalHours));

    let estimated_fee = billableHours * 10000; // fallback mặc định
    let price_item_used = null;
    let rate = 10000;

    if (vehicle?.vehicle_type_id) {
        try {
            // Tìm parking_id từ entry_exit_log (xe vào)
            const { data: entryLog } = await supabase
                .from("entry_exit_log")
                .select("parking_id")
                .eq("session_id", session.session_id)
                .eq("direction", "Xe vào")
                .maybeSingle();

            let priceItems = [];

            if (entryLog?.parking_id) {
                // Lấy price_table active của parking đó
                const { data: priceTable } = await supabase
                    .from("price_table")
                    .select("price_table_id")
                    .eq("parking_id", entryLog.parking_id)
                    .eq("status", "Hoạt động")
                    .limit(1)
                    .maybeSingle();

                if (priceTable) {
                    const { data: items } = await supabase
                        .from("price_item")
                        .select("*")
                        .eq("price_table_id", priceTable.price_table_id)
                        .eq("vehicle_type_id", vehicle.vehicle_type_id);
                    priceItems = items || [];
                }
            }

            // Fallback: lấy price_item thẳng theo vehicle_type nếu không tìm được qua price_table
            if (priceItems.length === 0) {
                const { data: items } = await supabase
                    .from("price_item")
                    .select("*")
                    .eq("vehicle_type_id", vehicle.vehicle_type_id);
                priceItems = items || [];
            }

            if (priceItems.length > 0) {
                const matchingItem = priceItems.find((item) => {
                    const min = item.min_hour ?? 0;
                    const max = item.max_hour;
                    if (max === null || max === undefined) {
                        return billableHours >= min;
                    }
                    return billableHours >= min && billableHours < max;
                });

                if (matchingItem) {
                    estimated_fee = Number(matchingItem.price);
                    price_item_used = matchingItem;
                    rate = Number(matchingItem.price);
                }
            }
        } catch (dbErr) {
            console.error("[feeCalculation] Lỗi tra cứu bảng phí, dùng fallback:", dbErr.message);
        }
    }

    const warning = isMonthlyExpired
        ? "Vé tháng đã hết hạn — vui lòng nhắc khách gia hạn"
        : null;

    return {
        session,
        vehicle,
        card,
        is_monthly_valid: false,
        estimated_fee,
        fee_breakdown: {
            hours: billableHours,
            price_item_used,
            rate,
        },
        ticket_type: "Thẻ lượt",
        warning,
    };
}
