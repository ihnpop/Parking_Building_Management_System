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
    let vehicle = null;
    if (session?.vehicle_id) {
        vehicle = await feeCalculationRepository.findVehicleById(session.vehicle_id);
    }

    // Fallback: tra cứu xe theo biển số nếu session không có vehicle_id hoặc thiếu vehicle_type_id
    if ((!vehicle || !vehicle.vehicle_type_id) && session?.plate_number) {
        vehicle = await feeCalculationRepository.findVehicleByPlate(session.plate_number);
    }

    let card = null;
    if (session?.card_id) {
        card = await feeCalculationRepository.findCardById(session.card_id);
    }

    // Fallback: tìm qua card_registrations nếu không có card_id trong session
    if (!card && vehicle?.vehicle_id) {
        const reg = await feeCalculationRepository.findActiveRegistrationByVehicleId(vehicle.vehicle_id);
        if (reg?.card) {
            card = reg.card;
        }
    }

    // Nếu có thẻ mà card.vehicle_package chưa có, tìm vehicle_package qua vehicle_id (chỉ khi là Thẻ tháng)
    if (card && card.type === "Thẻ tháng" && !card.vehicle_package && vehicle?.vehicle_id) {
        const vp = await feeCalculationRepository.findActiveVehiclePackageByVehicleId(vehicle.vehicle_id);
        if (vp) {
            card.vehicle_package = vp;
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
async function checkLostCard(card, vehicle, session) {
    if (card?.status === "Mất thẻ") {
        return true;
    }
    if (vehicle) {
        const lostLog = await feeCalculationRepository.findUnresolvedLostCardLog(vehicle.vehicle_id, session?.entry_time);
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

    if (card?.type === "Thẻ lượt") {
        return { isMonthlyValid: false, isMonthlyExpired: false };
    }

    const isMonthCard =
        card?.type === "Thẻ tháng" ||
        (typeof card?.code === "string" && card.code.toUpperCase().startsWith("MONTH")) ||
        card?.vehicle_package != null;

    if (!isMonthCard) {
        return { isMonthlyValid: false, isMonthlyExpired: false };
    }

    // 1. Nếu có thông tin gói vehicle_package
    const vehiclePackage = card?.vehicle_package ?? null;
    if (vehiclePackage) {
        const endDateStr = typeof vehiclePackage.end_date === "string"
            ? vehiclePackage.end_date.split("T")[0]
            : null;

        if (endDateStr) {
            const isValid = vehiclePackage.status === "Hoạt động" && endDateStr >= today;
            return {
                isMonthlyValid: isValid,
                isMonthlyExpired: !isValid,
            };
        }
    }

    // 2. Nếu có expired_date trực tiếp trên thẻ (table card)
    if (card?.expired_date) {
        const expDateStr = typeof card.expired_date === "string"
            ? card.expired_date.split("T")[0]
            : new Date(card.expired_date).toISOString().split("T")[0];

        const cardStatus = card.status || "Hoạt động";
        const isValid = (cardStatus === "Hoạt động" || cardStatus === "Đang sử dụng") && expDateStr >= today;
        return {
            isMonthlyValid: isValid,
            isMonthlyExpired: !isValid,
        };
    }

    // Fallback: Nếu là Thẻ tháng và có trạng thái hoạt động
    const activeStatus = card?.status || "Hoạt động";
    if (activeStatus === "Hoạt động" || activeStatus === "Đang sử dụng") {
        return { isMonthlyValid: true, isMonthlyExpired: false };
    }

    return { isMonthlyValid: false, isMonthlyExpired: true };
}

/**
 * Tra cứu dòng định mức giá phù hợp dựa trên số giờ gửi thực tế (totalHours).
 * Chỉ dùng để tra cứu giờ lẻ (< 24h) theo bảng giá khoảng:
 *  - 0 <= t < 0.5  → Miễn phí
 *  - 0.5 <= t < 2  → Mức 1
 *  - 2 <= t < 8    → Mức 2
 *  - 8 <= t        → Mức trần (giá trần ngày)
 *
 * @param {Array} priceItems
 * @param {number} totalHours
 * @returns {object|null}
 */
export const getMatchingPriceItem = (priceItems, totalHours) => {
    if (!priceItems || priceItems.length === 0) return null;

    const sorted = [...priceItems].sort((a, b) => (Number(a.min_hour) || 0) - (Number(b.min_hour) || 0));

    // 1. Tìm item khớp chuẩn khoảng [min_hour, max_hour)
    let matched = sorted.find((item) => {
        const min = Number(item.min_hour) || 0;
        const max = item.max_hour !== null && item.max_hour !== undefined ? Number(item.max_hour) : null;
        if (max === null) {
            return totalHours >= min;
        }
        return totalHours >= min && totalHours < max;
    });

    // 2. Fallback khoảng giá nếu t vượt quá max_hour cao nhất hoặc nằm giữa khoảng hở
    if (!matched) {
        const highestItem = sorted[sorted.length - 1];
        const lowestItem = sorted[0];

        if (totalHours >= (Number(highestItem.min_hour) || 0)) {
            matched = highestItem;
        } else if (totalHours < (Number(lowestItem.min_hour) || 0)) {
            matched = lowestItem;
        } else {
            for (let i = sorted.length - 1; i >= 0; i--) {
                if (totalHours >= (Number(sorted[i].min_hour) || 0)) {
                    matched = sorted[i];
                    break;
                }
            }
        }
    }

    return matched;
};

/**
 * Helper tính phí dựa trên số giờ gửi và các mốc price_item.
 * Quy tắc:
 * - Dưới 0.5h: Miễn phí (0đ).
 * - Dưới hoặc bằng 24h: Tìm mốc tương ứng trong bảng giá.
 * - Quá 24h: Cộng dồn lũy tiến = (Số ngày đầy đủ 24h x Giá mốc tối đa/ngày) + Phí của số giờ lẻ còn lại.
 *   Ví dụ: Gửi 26h (xe máy) -> 1 ngày (20k) + 2h lẻ (5k) = 25k.
 */
export function calculateFeeFromPriceItems(totalHours, priceItems) {
    if (!priceItems || priceItems.length === 0) {
        return { fee: 0, itemUsed: null };
    }

    // Sắp xếp các mốc giá theo min_hour tăng dần
    const sortedItems = [...priceItems].sort((a, b) => Number(a.min_hour) - Number(b.min_hour));
    const maxTierItem = sortedItems.find(i => i.max_hour === null || i.max_hour === undefined) || sortedItems[sortedItems.length - 1];
    const dayMaxPrice = Number(maxTierItem.price);

    const getItemForHours = (h) => {
        if (h < 0) return null;
        const billable = Math.ceil(h);

        // 1. Thử khớp trực tiếp với số giờ thực tế h (hỗ trợ các khung giờ lẻ như 0.5h)
        let found = priceItems.find((item) => {
            const min = Number(item.min_hour) || 0;
            const max = item.max_hour !== null && item.max_hour !== undefined ? Number(item.max_hour) : null;
            if (max === null) {
                return h >= min;
            }
            return h >= min && h <= max;
        });

        // 2. Nếu không có khung giờ trùng khớp trực tiếp, làm tròn lên theo giờ billable
        if (!found) {
            found = priceItems.find((item) => {
                const min = Number(item.min_hour) || 0;
                const max = item.max_hour !== null && item.max_hour !== undefined ? Number(item.max_hour) : null;
                if (max === null) {
                    return billable >= min;
                }
                return billable >= min && billable <= max;
            });
        }

        return found || maxTierItem;
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

        if (remHours > 0) {
            remItemUsed = getItemForHours(remHours);
            remFee = remItemUsed ? Number(remItemUsed.price) : 0;
        }

        const totalFee = (fullDays * dayMaxPrice) + remFee;
        return { fee: totalFee, itemUsed: maxTierItem, remItemUsed, fullDays, remHours, dailyCeilingPrice: dayMaxPrice, remainingFee: remFee };
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
 *   totalHours: number,
 *   fullDays: number,
 *   remainingHours: number,
 *   dailyCeilingPrice: number,
 *   remainingFee: number
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

    let estimated_fee = 0;
    let price_item_used = null;
    let rate = 0;


    let fullDays = 0;
    let remainingHours = 0;
    let dailyCeilingPrice = 0;
    let remainingFee = 0;

    let targetVehicle = vehicle;
    if ((!targetVehicle || !targetVehicle.vehicle_type_id) && session.plate_number) {
        targetVehicle = await feeCalculationRepository.findVehicleByPlate(session.plate_number);
    }

    const vehicleTypeId = targetVehicle?.vehicle_type_id || (typeof targetVehicle?.vehicle_type === 'object' ? targetVehicle?.vehicle_type?.vehicle_type_id : null);

    if (vehicleTypeId) {
        try {
            // Tìm parking_id từ entry_exit_log (xe vào)
            const parkingId = await feeCalculationRepository.findEntryParkingId(session.session_id);

            let priceItems = [];

            if (parkingId) {
                const priceTableId = await feeCalculationRepository.findActivePriceTableId(parkingId);
                if (priceTableId) {
                    priceItems = await feeCalculationRepository.findPriceItems(priceTableId, vehicleTypeId);
                }
            }

            // Fallback theo vehicle_type
            if (!priceItems || priceItems.length === 0) {
                priceItems = await feeCalculationRepository.findPriceItemsByVehicleType(vehicleTypeId);
            }

            if (priceItems.length > 0) {
                const calculated = calculateFeeFromPriceItems(totalHours, priceItems);
                estimated_fee = calculated.fee;
                price_item_used = calculated.itemUsed;
                rate = calculated.fee;
                fullDays = calculated.fullDays || 0;
                remainingHours = calculated.remHours || 0;
                dailyCeilingPrice = calculated.dailyCeilingPrice || 0;
                remainingFee = calculated.remainingFee || 0;
            }
        } catch (dbErr) {
            console.error("[feeCalculation] Lỗi tra cứu bảng phí, dùng fallback:", dbErr.message);
        }
    }

    return {
        estimated_fee,
        price_item_used,
        rate,
        totalHours,
        fullDays,
        remainingHours,
        dailyCeilingPrice,
        remainingFee
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
export async function calculateExitFee({ plate_number, skipLostCheck = false, session: preloadedSession = null }) {
    // ─── 1. Tìm phiên gửi xe đang mở ─────────────────────────────────────────
    // Nếu caller đã có session sẵn (ví dụ: từ lostCardService), dùng luôn
    // để tránh lỗi khi tìm lại qua plate_number không khớp
    let session = preloadedSession;
    if (!session) {
        if (!plate_number || !plate_number.trim()) {
            const err = new Error("Biển số xe là bắt buộc.");
            err.statusCode = 400;
            throw err;
        }
        const cleanPlate = plate_number.trim().toUpperCase();
        session = await findActiveSession(cleanPlate);
    }

    // ─── 2 & 3. Tìm thông tin xe & thẻ ────────────────────────────────────────
    const { vehicle, card } = await getVehicleAndCard(session);

    // ─── 4. Kiểm tra thẻ mất ─────────────────────────────────────────────────
    if (!skipLostCheck) {
        const isLostCard = await checkLostCard(card, vehicle, session);
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
    }

    const isMonthCard = card?.type === "Thẻ lượt" ? false : (
        card?.type === "Thẻ tháng" ||
        (typeof card?.code === "string" && card.code.toUpperCase().startsWith("MONTH")) ||
        card?.vehicle_package != null
    );

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

    // ─── 7. Tính phí theo công thức ngày + giờ lẻ ─────────────────────────────
    const {
        estimated_fee, price_item_used, rate, totalHours,
        fullDays, remainingHours, dailyCeilingPrice, remainingFee
    } = await calculateHourlyFee(session, vehicle);

    if (session?.session_id) {
        await feeCalculationRepository.updateSessionEstimatedFee(session.session_id, estimated_fee);
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
            hours: Number(totalHours.toFixed(2)),
            price_item_used,
            rate,
            // Thông tin chi tiết công thức mới
            fullDays,
            remainingHours: Number((remainingHours ?? 0).toFixed(2)),
            dailyCeilingPrice: dailyCeilingPrice ?? 0,
            remainingFee: remainingFee ?? 0,
        },
        ticket_type: (isMonthCard && card?.type !== "Thẻ lượt") ? "Thẻ tháng" : "Thẻ lượt",
        warning,
    };
}
