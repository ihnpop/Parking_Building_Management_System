import cron from "node-cron";
import supabase from "../config/supabaseClient.js";

/**
 * Khởi động cron job quét và xử lý các giao dịch chờ thanh toán quá 10 phút.
 * Chạy mỗi phút một lần.
 */
export function startPaymentExpiryJob() {
    cron.schedule("*/1 * * * *", async () => {
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

        console.log(`[PaymentExpiryJob] Bắt đầu quét giao dịch hết hạn lúc: ${now.toLocaleString()}`);

        try {
            // 1. Tìm các payment có status = 'Chờ thanh toán' và payment_time < now() - 10 phút
            const { data: expiredPayments, error: selectErr } = await supabase
                .from("payment")
                .select("payment_id, session_id, order_code, payment_time")
                .eq("status", "Chờ thanh toán")
                .lt("payment_time", tenMinutesAgo);

            if (selectErr) {
                throw new Error("Lỗi truy vấn payments hết hạn: " + selectErr.message);
            }

            if (!expiredPayments || expiredPayments.length === 0) {
                console.log("[PaymentExpiryJob] Không có giao dịch nào hết hạn.");
                return;
            }

            console.log(`[PaymentExpiryJob] Tìm thấy ${expiredPayments.length} giao dịch hết hạn.`);

            for (const payment of expiredPayments) {
                console.log(`[PaymentExpiryJob] Xử lý hết hạn cho đơn hàng: ${payment.order_code}`);

                // Cập nhật trạng thái payment thành 'Hết hạn'
                const { error: updatePayErr } = await supabase
                    .from("payment")
                    .update({ status: "Hết hạn" })
                    .eq("payment_id", payment.payment_id);

                if (updatePayErr) {
                    console.error(`[PaymentExpiryJob] Lỗi cập nhật status payment ${payment.payment_id}:`, updatePayErr.message);
                    continue;
                }

                // Nếu có session_id đi kèm, chuyển trạng thái session trở lại 'Đang gửi xe'
                if (payment.session_id) {
                    const { error: updateSessionErr } = await supabase
                        .from("parking_sessions")
                        .update({ status: "Đang gửi xe" })
                        .eq("session_id", payment.session_id);

                    if (updateSessionErr) {
                        console.error(`[PaymentExpiryJob] Lỗi phục hồi session ${payment.session_id} về 'Đang gửi xe':`, updateSessionErr.message);
                    } else {
                        console.log(`[PaymentExpiryJob] Đã hoàn trả trạng thái session ${payment.session_id} về 'Đang gửi xe'.`);
                    }
                }
            }
        } catch (err) {
            console.error("[PaymentExpiryJob] Gặp lỗi nghiêm trọng:", err.message);
        }
    });

    console.log("[PaymentExpiryJob] Đã kích hoạt scheduled task kiểm tra giao dịch VNPay hết hạn (mỗi 1 phút).");
}
