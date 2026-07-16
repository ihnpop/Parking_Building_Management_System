/**
 * paymentService.js
 * Dịch vụ xử lý nghiệp vụ thanh toán trung gian giữa database của bãi xe và cổng thanh toán VNPay.
 * Quản lý vòng đời hóa đơn (tạo mới, xác thực IPN, cập nhật trạng thái 'Đã thanh toán', 
 * và tự động thực hiện các hành động sau thanh toán như cho xe ra cổng hoặc gia hạn thẻ).
 */

import * as paymentRepository from "../repositories/paymentRepository.js";
import * as vnpayService from "./vnpayService.js";
import supabase from "../config/supabaseClient.js";

/**
 * Hàm phụ trợ lấy thông tin chi tiết một lượt gửi xe bằng ID
 */
async function getSessionById(sessionId) {
    const { data, error } = await supabase
        .from("parking_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

/**
 * Khởi tạo giao dịch thanh toán cho Vé lượt (xe chuẩn bị rời bãi)
 * 1. Tạo bản ghi hóa đơn tạm trong DB với trạng thái 'Chờ thanh toán'
 * 2. Tạo đường link thanh toán chuyển tiếp VNPAY
 */
export async function createCheckoutPayment(sessionId, amount, ipAddr) {
    const session = await getSessionById(sessionId);
    if (!session) throw new Error("Không tìm thấy phiên gửi xe");

    // Tạo mã đơn hàng duy nhất bắt đầu bằng PO (Parking Order) kèm mốc thời gian
    const orderCode = `PO${Date.now()}`;
    const payment = await paymentRepository.create({
        session_id: sessionId,
        payment_type: "Vé lượt",
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
    });

    return { payment, payUrl };
}

/**
 * Khởi tạo giao dịch thanh toán cho Vé tháng (Đăng ký mới hoặc Gia hạn)
 * 1. Tạo bản ghi hóa đơn tạm trong DB với trạng thái 'Chờ thanh toán'
 * 2. Tạo đường link thanh toán chuyển tiếp VNPAY
 */
export async function createPackagePayment(vehiclePackageId, amount, isRenewal, ipAddr) {
    // Tạo mã đơn hàng duy nhất bắt đầu bằng PK (Package) kèm mốc thời gian
    const orderCode = `PK${Date.now()}`;
    const payment = await paymentRepository.create({
        vehicle_package_id: vehiclePackageId,
        payment_type: isRenewal ? "Gia hạn vé tháng" : "Đăng ký vé tháng",
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
    const updated = await paymentRepository.updateStatus(orderCode, {
        status: success ? "Đã thanh toán" : "Thất bại",
        transaction_no: query.vnp_TransactionNo,
        bank_code: query.vnp_BankCode,
        paid_at: success ? new Date().toISOString() : null,
        raw_response: query,
    });

    // 6. Thực thi nghiệp vụ phụ trợ sau khi thanh toán thành công
    if (success) {
        // --- TRƯỜNG HỢP 1: Thanh toán Vé lượt (Tự động mở cổng/cho xe ra bãi) ---
        if (payment.payment_type === "Vé lượt" && payment.session_id) {
            const exitTime = new Date().toISOString();
            
            // Cập nhật trạng thái phiên đỗ xe thành 'Hoàn thành'
            await supabase
                .from("parking_sessions")
                .update({
                    exit_time: exitTime,
                    status: "Hoàn thành"
                })
                .eq("session_id", payment.session_id);

            // Lấy thông tin chi tiết phiên gửi xe để tạo log và trả thẻ
            const { data: sessionData } = await supabase
                .from("parking_sessions")
                .select("card_id, vehicle_id, plate_number")
                .eq("session_id", payment.session_id)
                .single();

            if (sessionData) {
                if (sessionData.card_id) {
                    // Hủy đăng ký thẻ hoạt động hiện thời
                    const { data: activeReg } = await supabase
                        .from("card_registrations")
                        .select("registration_id")
                        .eq("card_id", sessionData.card_id)
                        .eq("status", "Hoạt động")
                        .maybeSingle();

                    if (activeReg) {
                        await supabase
                            .from("card_registrations")
                            .update({ status: "Không hoạt động" })
                            .eq("registration_id", activeReg.registration_id);
                    }

                    // Reset trạng thái thẻ từ vật lý về 'Đang chờ'
                    await supabase
                        .from("card")
                        .update({ status: "Đang chờ" })
                        .eq("card_id", sessionData.card_id);
                }

                // Truy vấn loại xe và log xe vào trước đó để ghi nhận log xe ra cổng
                const { data: vehicle } = await supabase
                    .from("vehicle")
                    .select("vehicle_type_id")
                    .eq("vehicle_id", sessionData.vehicle_id)
                    .maybeSingle();

                const { data: entryLog } = await supabase
                    .from("entry_exit_log")
                    .select("building_id, parking_id")
                    .eq("session_id", payment.session_id)
                    .eq("direction", "Xe vào")
                    .maybeSingle();

                const buildingId = entryLog?.building_id;
                const parkingId = entryLog?.parking_id;
                let exitGateId = null;

                // Tự động tìm ID cổng ra phù hợp
                if (parkingId) {
                    const { data: gates } = await supabase
                        .from("gate")
                        .select("gate_id")
                        .eq("parking_id", parkingId)
                        .eq("gate_type", "Cổng ra")
                        .limit(1);
                    if (gates && gates.length > 0) {
                        exitGateId = gates[0].gate_id;
                    }
                }

                // Ghi nhận nhật ký xe ra cổng thành công vào bảng entry_exit_log
                await supabase
                    .from("entry_exit_log")
                    .insert({
                        session_id: payment.session_id,
                        vehicle_id: sessionData.vehicle_id,
                        card_id: sessionData.card_id,
                        building_id: buildingId || null,
                        parking_id: parkingId || null,
                        gate_id: exitGateId || null,
                        direction: "Xe ra",
                        event_time: exitTime,
                        vehicle_type_id: vehicle?.vehicle_type_id || null,
                        plate_number: sessionData.plate_number,
                        ticket_type: "Thẻ lượt",
                        applied_price: payment.amount,
                        note: "Khách thanh toán qua VNPay và tự động check-out"
                    });
            }
        } 
        // --- TRƯỜNG HỢP 2: Gia hạn vé tháng (Nhánh A — cộng kỳ mới nối tiếp) ---
        else if (payment.payment_type === "Gia hạn vé tháng") {
            // Gọi renewalService để xử lý toàn bộ DB operations sau khi payment thành công
            // (tạo vehicle_package mới, cập nhật card.expired_date, ghi log)
            const { processRenewalSuccess } = await import("./renewalService.js");
            await processRenewalSuccess(orderCode);
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