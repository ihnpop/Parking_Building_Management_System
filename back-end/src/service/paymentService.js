import AppError from "../utils/AppError.js";
/**
 * paymentService.js
 * Dịch vụ xử lý nghiệp vụ thanh toán trung gian giữa database của bãi xe và cổng thanh toán VNPay.
 * Quản lý vòng đời hóa đơn (tạo mới, xác thực IPN, cập nhật trạng thái 'Đã thanh toán',
 * và tự động thực hiện các hành động sau thanh toán như cho xe ra cổng hoặc gia hạn thẻ).
 */

import * as paymentRepository from "../repositories/paymentRepository.js";
import * as vnpayService from "./vnpayService.js";
import { processReissueSuccess, processLostTurnCardPaymentSuccess } from "./lostCardService.js";
import { processRenewalSuccess } from "./renewalService.js";
import { calculateExitFee } from "./feeCalculationService.js";

/**
 * Khởi tạo giao dịch thanh toán cho thẻ lượt (xe chuẩn bị rời bãi)
 * 1. Tạo bản ghi hóa đơn tạm trong DB với trạng thái 'Chờ thanh toán'
 * 2. Tạo đường link thanh toán chuyển tiếp VNPAY
 */
export async function createCheckoutPayment(sessionId, amount, ipAddr, origin) {
    const session = await paymentRepository.findSessionById(sessionId);
    if (!session) throw new Error("Không tìm thấy phiên gửi xe");

    // Tạo mã đơn hàng duy nhất bắt đầu bằng PO (Parking Order) kèm mốc thời gian
    const orderCode = `PO${Date.now()}`;
    const payment = await paymentRepository.create({
        session_id: sessionId,
        payment_type: "thẻ lượt",
        amount,
        order_code: orderCode,
        status: "Chờ thanh toán",
    });

    // Tạo link redirect sang cổng VNPay
    const payUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount,
        orderInfo: `Thanh toan gui xe ${session.plate_number || ""}`,
        ipAddr,
        origin,
    });

    return { payment, payUrl };
}

/**
 * Khởi tạo giao dịch thanh toán cho thẻ tháng (Đăng ký mới hoặc Gia hạn)
 * 1. Tạo bản ghi hóa đơn tạm trong DB với trạng thái 'Chờ thanh toán'
 * 2. Tạo đường link thanh toán chuyển tiếp VNPAY
 */
export async function createPackagePayment(vehiclePackageId, amount, isRenewal, ipAddr, origin) {
    // Tạo mã đơn hàng duy nhất bắt đầu bằng PK (Package) kèm mốc thời gian
    const orderCode = `PK${Date.now()}`;
    const payment = await paymentRepository.create({
        vehicle_package_id: vehiclePackageId,
        payment_type: isRenewal ? "Gia hạn thẻ tháng" : "Đăng ký thẻ tháng",
        amount,
        order_code: orderCode,
        status: "Chờ thanh toán",
    });

    // Tạo link redirect sang cổng VNPay
    const payUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount,
        orderInfo: `Thanh toan ve thang ${orderCode}`,
        ipAddr,
        origin,
    });

    return { payment, payUrl };
}

/**
 * Xử lý IPN (Thông báo kết quả giao dịch từ VNPay)
 * Đảm bảo các bước kiểm tra chặt chẽ theo tài liệu tích hợp của VNPay:
 * 1. Kiểm tra chữ ký bảo mật (checksum)
 * 2. Tìm hóa đơn trong database theo order_code (vnp_TxnRef)
 * 3. Kiểm tra số tiền thanh toán (amount) có khớp với hóa đơn
 * 4. Kiểm tra trạng thái đơn hàng (chỉ cho phép xử lý hóa đơn đang 'Chờ thanh toán')
 * 5. Cập nhật trạng thái thành 'Đã thanh toán' hoặc 'Thất bại'
 * 6. Thực thi các logic nghiệp vụ sau thanh toán thành công (checkout xe hoặc gia hạn thẻ)
 */
export async function handleIpn(query) {
    // 1. Kiểm tra chữ ký bảo mật checksum của VNPay
    const isValid = vnpayService.verifySignature(query);
    if (!isValid) {
        return { RspCode: "97", Message: "Fail checksum" };
    }

    const orderCode = query.vnp_TxnRef;

    // 2. Tìm hóa đơn trong DB
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) {
        return { RspCode: "01", Message: "Order not found" };
    }

    // 3. Đối chiếu số tiền (VNPAY gửi số tiền đã nhân 100, cần chia 100 hoặc nhân 100 số tiền DB để so sánh)
    const amountMatch = Number(query.vnp_Amount) === Math.round(payment.amount) * 100;
    if (!amountMatch) {
        return { RspCode: "04", Message: "Invalid amount" };
    }

    // 4. Kiểm tra xem hóa đơn đã được xác nhận hay chưa (Tránh xử lý lặp lại giao dịch - Idempotency)
    if (payment.status !== "Chờ thanh toán") {
        return { RspCode: "02", Message: "Order already confirmed" };
    }

    // Xác định giao dịch thành công (Mã phản hồi vnp_ResponseCode và vnp_TransactionStatus bằng "00")
    const success = query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";

    // 5. Cập nhật thông tin hóa đơn trong database
    await paymentRepository.updateStatus(orderCode, {
        status: success ? "Đã thanh toán" : "Thất bại",
        transaction_no: query.vnp_TransactionNo,
        bank_code: query.vnp_BankCode,
        paid_at: success ? new Date().toISOString() : null,
        raw_response: query,
    });

    // 6. Thực thi nghiệp vụ phụ trợ sau khi thanh toán thành công
    if (success) {
        // --- TRƯỜNG HỢP 1: Thanh toán thẻ lượt (Tự động mở cổng/cho xe ra bãi) ---
        if (payment.payment_type === "thẻ lượt" && payment.session_id) {
            await _processVnpayCheckout(payment);
        }
        // --- TRƯỜNG HỢP 2: Gia hạn thẻ tháng (Nhánh A — cộng kỳ mới nối tiếp) ---
        else if (payment.payment_type === "Gia hạn thẻ tháng") {
            // Gọi renewalService để xử lý toàn bộ DB operations sau khi payment thành công
            // (tạo vehicle_package mới, cập nhật card.expired_date, ghi log)
            await processRenewalSuccess(orderCode);
        }
        // --- TRƯỜNG HỢP 3: Phí cấp lại thẻ tháng ---
        else if (payment.payment_type === "Phí cấp lại thẻ") {
            try {
                await processReissueSuccess(orderCode);
            } catch (reissueErr) {
                console.error("[handleIpn] Lỗi xử lý nghiệp vụ cấp lại thẻ (payment đã thành công):", reissueErr.message);
            }
        }
        // --- TRƯỜNG HỢP 4: Phí mất thẻ lượt ---
        else if (payment.payment_type === "Phí mất thẻ lượt") {
            try {
                await processLostTurnCardPaymentSuccess(orderCode);
            } catch (lostTurnErr) {
                console.error("[handleIpn] Lỗi xử lý nghiệp vụ mất thẻ lượt (payment đã thành công):", lostTurnErr.message);
                await import("./repositories/paymentRepository.js").then(repo => repo.updateStatus(orderCode, {
                    note: payment.note + " | ERROR: " + lostTurnErr.message + " | STACK: " + lostTurnErr.stack
                })).catch(() => { });
            }
        }
    }

    return { RspCode: "00", Message: "Confirm Success" };
}

/**
 * Lấy chi tiết thông tin hóa đơn bằng mã đơn hàng (orderCode)
 */
export async function getPaymentByOrderCode(orderCode) {
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) throw new Error("Không tìm thấy giao dịch");
    return payment;
}

/**
 * Lấy trạng thái thanh toán (polling) theo order_code — chỉ SELECT, KHÔNG update
 */
export async function getPaymentStatus(orderCode) {
    const data = await paymentRepository.findStatusByOrderCode(orderCode);
    if (!data) throw new AppError("Không tìm thấy giao dịch", 404);
    return data;
}

/**
 * Thanh toán tiền mặt cho thẻ lượt (BR-TT-10 → BR-TT-12, BR-TT-24 → BR-TT-25)
 *
 * - Tính lại estimated_fee từ DB (KHÔNG tin số tiền client gửi lên)
 * - Insert payment (Tiền mặt, Đã thanh toán)
 * - Update parking_sessions (exit_time, final_fee, status, staff_out_id)
 * - Giải phóng thẻ lượt
 * - Insert entry_exit_log (Xe ra)
 *
 * @param {string} sessionId
 * @param {string} staffId
 */
export async function cashPayment(sessionId, staffId) {
    // 1. Lấy và validate session
    const session = await paymentRepository.findSessionById(sessionId);
    if (!session) throw new AppError("Không tìm thấy phiên gửi xe", 404);
    if (session.status !== "Đang gửi xe" && session.status !== "Chờ thanh toán") {
        throw Object.assign(
            new Error(`Phiên gửi xe có trạng thái '${session.status}', không thể thanh toán tiền mặt.`),
            { statusCode: 400 }
        );
    }

    // 2. Tính lại phí từ DB (không tin client)
    const feeResult = await calculateExitFee({ plate_number: session.plate_number });

    if (feeResult.estimated_fee === 0 && feeResult.ticket_type === "Thẻ tháng") {
        throw Object.assign(
            new Error("Phiên này không cần thanh toán, dùng endpoint mở barie trực tiếp."),
            { statusCode: 400 }
        );
    }

    const amount = feeResult.estimated_fee;
    const ticketType = feeResult.ticket_type;
    const exitTime = new Date().toISOString();

    // 3. Insert payment tiền mặt
    const payment = await paymentRepository.create({
        session_id: sessionId,
        payment_type: "thẻ lượt",
        payment_method: "Tiền mặt",
        provider: null,
        order_code: null,
        amount,
        status: "Đã thanh toán",
        paid_at: exitTime,
        payment_time: exitTime,
        created_by: staffId || null,
    });

    // 4. Cập nhật phiên gửi xe
    await paymentRepository.updateSessionOnCheckout(sessionId, {
        exitTime,
        finalFee: amount,
        estimatedFee: amount,
        staffOutId: staffId,
    });

    // 5. Giải phóng thẻ lượt (nếu có card_id)
    if (session.card_id) {
        await paymentRepository.releaseCard(session.card_id);
    }

    // 6. Lấy thông tin để ghi log và tìm cổng ra
    const entryLog = await paymentRepository.findEntryLog(sessionId);
    let exitGateId = null;
    if (entryLog?.parking_id) {
        exitGateId = await paymentRepository.findExitGate(entryLog.parking_id);
    }

    // 7. Ghi nhật ký xe ra cổng
    if (entryLog?.building_id && entryLog?.parking_id && exitGateId) {
        await paymentRepository.insertExitLog({
            sessionId,
            vehicleId: session.vehicle_id,
            cardId: session.card_id,
            buildingId: entryLog.building_id,
            parkingId: entryLog.parking_id,
            gateId: exitGateId,
            staffId,
            exitTime,
            vehicleTypeId: feeResult.vehicle?.vehicle_type_id || null,
            plateNumber: session.plate_number,
            ticketType,
            appliedPrice: amount,
            note: "Thanh toán tiền mặt tại quầy",
        });
    }

    return {
        payment,
        session: { ...session, exit_time: exitTime, final_fee: amount, estimated_fee: amount, status: "Hoàn thành" },
        message: "Thanh toán tiền mặt thành công, có thể mở barie",
    };
}

/**
 * Tạo giao dịch VNPay an toàn cho thẻ lượt
 * - Tính lại fee từ DB, KHÔNG tin amount từ client
 * - Sinh order_code duy nhất (PK + timestamp + random), retry nếu trùng
 * - Insert payment 'Chờ thanh toán', update session status, tạo URL VNPay
 *
 * @param {string} sessionId
 * @param {string} staffId
 * @param {string} ipAddr
 */
export async function createVnpayPayment(sessionId, staffId, ipAddr, origin) {
    // 1. Lấy + validate session
    const session = await paymentRepository.findSessionById(sessionId);
    if (!session) throw new AppError("Không tìm thấy phiên gửi xe", 404);
    if (session.status !== "Đang gửi xe" && session.status !== "Chờ thanh toán") {
        throw Object.assign(
            new Error(`Phiên gửi xe có trạng thái '${session.status}', không thể tạo giao dịch VNPay.`),
            { statusCode: 400 }
        );
    }

    // 2. Tính lại phí từ DB
    const feeResult = await calculateExitFee({ plate_number: session.plate_number });

    if (feeResult.estimated_fee === 0 && feeResult.ticket_type === "Thẻ tháng") {
        throw Object.assign(
            new Error("Phiên này không cần thanh toán, dùng endpoint mở barie trực tiếp."),
            { statusCode: 400 }
        );
    }

    const amount = feeResult.estimated_fee;

    // 3. Sinh order_code duy nhất, retry nếu trùng
    let orderCode;
    let attempts = 0;
    do {
        const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        const rand = Math.floor(Math.random() * 9000) + 1000;
        orderCode = `PK${ts}${rand}`;
        const exists = await paymentRepository.orderCodeExists(orderCode);
        if (!exists) break;
        attempts++;
    } while (attempts < 5);

    // 4. Insert payment 'Chờ thanh toán'
    const payment = await paymentRepository.create({
        session_id: sessionId,
        payment_type: "thẻ lượt",
        payment_method: "VNPay",
        provider: "VNPay",
        order_code: orderCode,
        amount,
        status: "Chờ thanh toán",
        paid_at: null,
        created_by: staffId || null,
    });

    // 5. Cập nhật trạng thái session và lưu estimated_fee
    await paymentRepository.updateSessionStatus(sessionId, "Chờ thanh toán", { estimated_fee: amount });

    // 6. Tạo URL VNPay
    const normalizedIp =
        !ipAddr || ipAddr === "::1" || ipAddr.includes("::ffff:")
            ? "127.0.0.1"
            : ipAddr;

    const paymentUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount,
        orderInfo: `Thanh toan gui xe ${session.plate_number || ""}`,
        ipAddr: normalizedIp,
        origin,
    });

    return {
        payment_url: paymentUrl,
        order_code: orderCode,
        expires_in_seconds: 600,
        payment,
    };
}

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

/**
 * Xử lý checkout tự động sau khi VNPay xác nhận thanh toán thẻ lượt thành công.
 * Bao gồm: cập nhật session, giải phóng thẻ, ghi log xe ra.
 * @private
 */
async function _processVnpayCheckout(payment) {
    const exitTime = new Date().toISOString();
    const sessionId = payment.session_id;

    // Cập nhật phiên gửi xe
    await paymentRepository.updateSessionOnCheckout(sessionId, {
        exitTime,
        finalFee: payment.amount,
        estimatedFee: payment.amount,
        staffOutId: payment.created_by,
    });

    // Lấy thêm thông tin phiên để trả thẻ và ghi log
    const sessionData = await paymentRepository.findSessionSummary(sessionId);
    if (!sessionData) return;

    // Giải phóng thẻ lượt vật lý
    if (sessionData.card_id) {
        await paymentRepository.releaseCard(sessionData.card_id);
    }

    // Lấy thông tin cổng ra và vị trí bãi
    const vehicleTypeId = await paymentRepository.findVehicleTypeId(sessionData.vehicle_id);
    const entryLog = await paymentRepository.findEntryLog(sessionId);
    let exitGateId = null;
    if (entryLog?.parking_id) {
        exitGateId = await paymentRepository.findExitGate(entryLog.parking_id);
    }

    // Ghi nhật ký xe ra cổng
    await paymentRepository.insertExitLog({
        sessionId,
        vehicleId: sessionData.vehicle_id,
        cardId: sessionData.card_id,
        buildingId: entryLog?.building_id,
        parkingId: entryLog?.parking_id,
        gateId: exitGateId,
        staffId: null,
        exitTime,
        vehicleTypeId,
        plateNumber: sessionData.plate_number,
        ticketType: "Thẻ lượt",
        appliedPrice: payment.amount,
        note: "Khách thanh toán qua VNPay và tự động check-out",
    });
}