/**
 * feeCalculationService.js
 * Service tính phí gửi xe và kiểm tra điều kiện cho xe ra.
 * Được dùng chung bởi: thanh toán tiền mặt, tạo giao dịch VNPay, và endpoint check-exit.
 *
 * Business rules: BR-TT-01 → BR-TT-05
 */

import * as feeCalculationRepository from "../repositories/feeCalculationRepository.js";

/**
 * Tìm phiên gửi xe đang mở
 * @param {string} cleanPlate
 * @returns {Promise<object>}
 */
async function findActiveSession(cleanPlate) {
    const session = await feeCalculationRepository.findActiveSession(cleanPlate);
    if (!session) {
        const err = new Error(`Không tìm thấy phiên gửi xe đang mở cho xe ${cleanPlate}.`);
        err.statusCode = 404;
        throw err;
    }
    return session;
}

/**
 * Tìm thông tin xe và thẻ gắn với phiên
 * @param {object} session
 * @returns {Promise<{vehicle: object|null, card: object|null}>}
 */
async function getVehicleAndCard(session) {
    const vehicle = await feeCalculationRepository.findVehicleById(session.vehicle_id);

    let card = null;
    if (session.card_id) {
        card = await feeCalculationRepository.findCardById(session.card_id);
    }

    // Fallback: tìm qua card_registrations nếu không có card_id trong session
    if (!card && vehicle) {
        const reg = await feeCalculationRepository.findActiveRegistrationByVehicleId(vehicle.vehicle_id);
        if (reg?.card) {
            card = reg.card;
        }
    }

    return { vehicle, card };
}

/**
 * Kiểm tra xem thẻ hoặc xe có báo mất không
 * @param {object|null} card
 * @param {object|null} vehicle
 * @returns {Promise<boolean>}
 */
async function checkLostCard(card, vehicle) {
    if (card?.status === "Mất thẻ") {
        return true;
    }
    if (vehicle) {
        const lostLog = await feeCalculationRepository.findUnresolvedLostCardLog(vehicle.vehicle_id);
        if (lostLog) {
            return true;
        }
    }
    return false;
}

/**
 * Kiểm tra trạng thái hiệu lực của vé tháng
 * @param {object|null} card
 * @returns {{isMonthlyValid: boolean, isMonthlyExpired: boolean}}
 */
function checkMonthlyValidity(card) {
    const today = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'
    const vehiclePackage = card?.vehicle_package ?? null;

    const isMonthlyValid =
        vehiclePackage !== null &&
        vehiclePackage.status === "Hoạt động" &&
        vehiclePackage.end_date >= today;

    const isMonthlyExpired =
        vehiclePackage !== null &&
        (vehiclePackage.end_date < today || vehiclePackage.status !== "Hoạt động");

    return { isMonthlyValid, isMonthlyExpired };
}

/**
 * Helper tính phí dựa trên số giờ gửi và các mốc price_item.
 * Quy tắc:
 * - Dưới 0.5h: Miễn phí (0đ).
 * - Dưới hoặc bằng 24h: Tìm mốc tương ứng trong bảng giá.
 * - Quá 24h: Cộng dồn lũy tiến = (Số ngày đầy đủ 24h x Giá mốc tối đa/ngày) + Phí của số giờ lẻ còn lại.
 *   Ví dụ: Gửi 26h (xe máy) -> 1 ngày (20k) + 2h lẻ (5k) = 25k.
 */
export function calculateFeeFromPriceItems(totalHours, priceItems) {
    if (totalHours < 0.5) {
        return { fee: 0, itemUsed: null };
    }

    if (!priceItems || priceItems.length === 0) {
        const billableHours = Math.max(1, Math.ceil(totalHours));
        return { fee: billableHours * 10000, itemUsed: null };
    }

    // Sắp xếp các mốc giá theo min_hour tăng dần
    const sortedItems = [...priceItems].sort((a, b) => Number(a.min_hour) - Number(b.min_hour));
    const maxTierItem = sortedItems.find(i => i.max_hour === null || i.max_hour === undefined) || sortedItems[sortedItems.length - 1];
    const dayMaxPrice = Number(maxTierItem.price);

    const getItemForHours = (h) => {
        if (h <= 0) return null;
        const billable = Math.ceil(h);
        return priceItems.find((item) => {
            const min = Number(item.min_hour) || 0;
            const max = item.max_hour !== null && item.max_hour !== undefined ? Number(item.max_hour) : null;
            if (max === null) {
                return billable >= min;
            }
            return billable >= min && billable <= max;
        }) || maxTierItem;
    };

    if (totalHours <= 24) {
        const matchingItem = getItemForHours(totalHours);
        const fee = matchingItem ? Number(matchingItem.price) : 0;
        return { fee, itemUsed: matchingItem };
    } else {
        const fullDays = Math.floor(totalHours / 24);
        const remHours = totalHours - (fullDays * 24);

        let remFee = 0;
        let remItemUsed = null;

        if (remHours >= 0.5) {
            remItemUsed = getItemForHours(remHours);
            remFee = remItemUsed ? Number(remItemUsed.price) : 0;
        }

        const totalFee = (fullDays * dayMaxPrice) + remFee;
        return { fee: totalFee, itemUsed: maxTierItem, remItemUsed, fullDays, remHours };
    }
}

/**
 * Tính phí theo số giờ thực tế và cấu hình bảng giá trong DB
 * @param {object} session
 * @param {object|null} vehicle
 * @returns {Promise<{
 *   estimated_fee: number,
 *   price_item_used: object|null,
 *   rate: number,
 *   totalHours: number
 * }>}
 */
async function calculateHourlyFee(session, vehicle) {
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

    let estimated_fee = totalHours < 0.5 ? 0 : billableHours * 10000; // fallback mặc định
    let price_item_used = null;
    let rate = totalHours < 0.5 ? 0 : 10000;

    if (vehicle?.vehicle_type_id) {
        try {
            // Tìm parking_id từ entry_exit_log (xe vào)
            const parkingId = await feeCalculationRepository.findEntryParkingId(session.session_id);

            let priceItems = [];

            if (parkingId) {
                // Lấy price_table active của parking đó
                const priceTableId = await feeCalculationRepository.findActivePriceTableId(parkingId);

                if (priceTableId) {
                    priceItems = await feeCalculationRepository.findPriceItems(priceTableId, vehicle.vehicle_type_id);
                }
            }

            // Fallback: lấy price_item thẳng theo vehicle_type nếu không tìm được qua price_table
            if (priceItems.length === 0) {
                priceItems = await feeCalculationRepository.findPriceItemsByVehicleType(vehicle.vehicle_type_id);
            }

            if (priceItems.length > 0) {
                const calculated = calculateFeeFromPriceItems(totalHours, priceItems);
                estimated_fee = calculated.fee;
                price_item_used = calculated.itemUsed;
                rate = calculated.fee;
            }
        } catch (dbErr) {
            console.error("[feeCalculation] Lỗi tra cứu bảng phí, dùng fallback:", dbErr.message);
        }
    }

    return {
        estimated_fee,
        price_item_used,
        rate,
        totalHours
    };
}

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

    // ─── 1. Tìm phiên gửi xe đang mở ─────────────────────────────────────────
    const session = await findActiveSession(cleanPlate);

    // ─── 2 & 3. Tìm thông tin xe & thẻ ────────────────────────────────────────
    const { vehicle, card } = await getVehicleAndCard(session);

    // ─── 4. Kiểm tra thẻ mất ─────────────────────────────────────────────────
    const isLostCard = await checkLostCard(card, vehicle);
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
    const { isMonthlyValid, isMonthlyExpired } = checkMonthlyValidity(card);

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
    const { estimated_fee, price_item_used, rate, totalHours } = await calculateHourlyFee(session, vehicle);

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
            hours: Number(totalHours.toFixed(2)),
            price_item_used,
            rate,
        },
        ticket_type: "Thẻ lượt",
        warning,
    };
}
