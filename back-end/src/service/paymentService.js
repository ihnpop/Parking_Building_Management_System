import * as paymentRepository from "../repositories/paymentRepository.js";
import * as vnpayService from "./vnpayService.js";
import supabase from "../config/supabaseClient.js";

async function getSessionById(sessionId) {
    const { data, error } = await supabase
        .from("parking_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function createCheckoutPayment(sessionId, amount, ipAddr) {
    const session = await getSessionById(sessionId);
    if (!session) throw new Error("Không tìm thấy phiên gửi xe");

    const orderCode = `PO${Date.now()}`;
    const payment = await paymentRepository.create({
        session_id: sessionId,
        payment_type: "Vé lượt",
        amount,
        order_code: orderCode,
        status: "Chờ thanh toán",
    });

    const payUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount,
        orderInfo: `Thanh toan gui xe ${session.plate_number || ""}`,
        ipAddr,
    });

    return { payment, payUrl };
}

export async function createPackagePayment(vehiclePackageId, amount, isRenewal, ipAddr) {
    const orderCode = `PK${Date.now()}`;
    const payment = await paymentRepository.create({
        vehicle_package_id: vehiclePackageId,
        payment_type: isRenewal ? "Gia hạn vé tháng" : "Đăng ký vé tháng",
        amount,
        order_code: orderCode,
        status: "Chờ thanh toán",
    });

    const payUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount,
        orderInfo: `Thanh toan ve thang ${orderCode}`,
        ipAddr,
    });

    return { payment, payUrl };
}

// ⬇️ ĐÂY LÀ HÀM ĐÃ SỬA — thay thế hoàn toàn hàm handleIpn cũ
export async function handleIpn(query) {
    const isValid = vnpayService.verifySignature(query);
    if (!isValid) {
        return { RspCode: "97", Message: "Fail checksum" };
    }

    const orderCode = query.vnp_TxnRef;
    const payment = await paymentRepository.findByOrderCode(orderCode);

    if (!payment) {
        return { RspCode: "01", Message: "Order not found" };
    }

    const amountMatch = Number(query.vnp_Amount) === Math.round(payment.amount) * 100;
    if (!amountMatch) {
        return { RspCode: "04", Message: "Invalid amount" };
    }

    if (payment.status !== "Chờ thanh toán") {
        return { RspCode: "02", Message: "Order already confirmed" };
    }

    const success = query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";

    const updated = await paymentRepository.updateStatus(orderCode, {
        status: success ? "Đã trả" : "Thất bại",
        transaction_no: query.vnp_TransactionNo,
        bank_code: query.vnp_BankCode,
        paid_at: success ? new Date().toISOString() : null,
        raw_response: query,
    });

    if (success) {
        if (payment.payment_type === "Vé lượt" && payment.session_id) {
            const exitTime = new Date().toISOString();
            // Update parking session
            await supabase
                .from("parking_sessions")
                .update({
                    exit_time: exitTime,
                    status: "Hoàn thành"
                })
                .eq("session_id", payment.session_id);

            // Fetch the session details to get card_id, vehicle_id, plate_number
            const { data: sessionData } = await supabase
                .from("parking_sessions")
                .select("card_id, vehicle_id, plate_number")
                .eq("session_id", payment.session_id)
                .single();

            if (sessionData) {
                if (sessionData.card_id) {
                    // Deactivate registration
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

                    // Reset card status to 'Đang chờ'
                    await supabase
                        .from("card")
                        .update({ status: "Đang chờ" })
                        .eq("card_id", sessionData.card_id);
                }

                // Fetch vehicle and entry log for context
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
        } else if (payment.payment_type === "Gia hạn vé tháng" && payment.vehicle_package_id) {
            // Gia hạn vé tháng: vehicle_package_id stores the registrationId
            const RENEW_PACKAGES = [
                { months: 1, price: 300000 },
                { months: 3, price: 850000 },
                { months: 6, price: 1650000 },
                { months: 9, price: 2400000 },
                { months: 12, price: 3000000 }
            ];
            const pkg = RENEW_PACKAGES.find(p => p.price === Number(payment.amount));
            const months = pkg ? pkg.months : 1;

            const { renewMonthlyCard } = await import("./monthCardService.js");
            await renewMonthlyCard({
                registrationId: payment.vehicle_package_id,
                months: months,
                note: `Gia hạn thanh toán qua VNPay - GD ${orderCode}`,
                currentUserId: payment.created_by
            });
        }
    }

    return { RspCode: "00", Message: "Confirm Success" };
}

export async function getPaymentByOrderCode(orderCode) {
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) throw new Error("Không tìm thấy giao dịch");
    return payment;
}