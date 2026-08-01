import cron from "node-cron";
import supabase from "../config/supabaseClient.js";

/**
 * Khởi động cron job quét và xử lý các giao dịch chờ thanh toán quá 15 phút.
 * Chạy mỗi phút một lần để phát hiện kịp thời.
 */
export function startPaymentExpiryJob() {
    cron.schedule("* * * * *", async () => {
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

        try {
            // 1. Tìm các payment có status = 'Chờ thanh toán' và payment_time < now() - 15 phút
            const { data: expiredPayments, error: selectErr } = await supabase
                .from("payment")
                .select("payment_id, session_id, order_code, payment_time, payment_type")
                .eq("status", "Chờ thanh toán")
                .lt("payment_time", fifteenMinutesAgo);

            if (selectErr) {
                throw new Error("Lỗi truy vấn payments hết hạn: " + selectErr.message);
            }

            if (!expiredPayments || expiredPayments.length === 0) {
                return;
            }

            console.log(`[PaymentExpiryJob] Tìm thấy ${expiredPayments.length} giao dịch hết hạn lúc: ${now.toLocaleString()}`);

            for (const payment of expiredPayments) {
                // Giao dịch thẻ tháng (Đăng ký / Gia hạn) → đánh dấu 'Thất bại'
                // Giao dịch thẻ lượt → đánh dấu 'Hết hạn' (giữ tương thích hệ thống cũ)
                const isMonthCard = ['Đăng ký vé tháng', 'Đăng ký thẻ tháng', 'Gia hạn vé tháng', 'Gia hạn thẻ tháng'].includes(payment.payment_type);
                const newStatus = isMonthCard ? 'Thất bại' : 'Hết hạn';

                console.log(`[PaymentExpiryJob] Xử lý hết hạn cho đơn: ${payment.order_code} → ${newStatus}`);

                const { error: updatePayErr } = await supabase
                    .from("payment")
                    .update({ status: newStatus })
                    .eq("payment_id", payment.payment_id);

                if (updatePayErr) {
                    console.error(`[PaymentExpiryJob] Lỗi cập nhật payment ${payment.payment_id}:`, updatePayErr.message);
                    continue;
                }

                // Với thẻ lượt: nếu có session_id, phục hồi session về 'Đang gửi xe'
                if (!isMonthCard && payment.session_id) {
                    const { error: updateSessionErr } = await supabase
                        .from("parking_sessions")
                        .update({ status: "Đang gửi xe" })
                        .eq("session_id", payment.session_id);

                    if (updateSessionErr) {
                        console.error(`[PaymentExpiryJob] Lỗi phục hồi session ${payment.session_id}:`, updateSessionErr.message);
                    } else {
                        console.log(`[PaymentExpiryJob] Đã hoàn trả session ${payment.session_id} về 'Đang gửi xe'.`);
                    }
                }
            }
        } catch (err) {
            console.error("[PaymentExpiryJob] Gặp lỗi nghiêm trọng:", err.message);
        }
    });

    console.log("[PaymentExpiryJob] Đã kích hoạt scheduled task kiểm tra giao dịch hết hạn (mỗi 1 phút, timeout 15 phút).");
}
