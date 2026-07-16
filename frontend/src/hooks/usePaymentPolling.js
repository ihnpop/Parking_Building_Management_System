import { useEffect, useState, useRef } from "react";
import { getPaymentStatus } from "../service/paymentApi";

/**
 * Custom hook thực hiện polling trạng thái thanh toán từ backend.
 * Tự động dừng polling khi đạt trạng thái kết thúc (Đã thanh toán, Thất bại, Hết hạn).
 *
 * @param {string} orderCode - Mã giao dịch cần check status
 * @param {number} intervalMs - Khoảng thời gian giữa các lần poll (mặc định 3000ms)
 * @param {boolean} active - Cờ cho biết có kích hoạt polling hay không
 * @returns {{
 *   status: string|null,
 *   payment: object|null,
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function usePaymentPolling(orderCode, intervalMs = 3000, active = true) {
    const [status, setStatus] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        // Reset state when orderCode changes
        setStatus(null);
        setPayment(null);
        setError(null);

        if (!orderCode || !active) {
            return;
        }

        setLoading(true);

        const checkStatus = async () => {
            try {
                const res = await getPaymentStatus(orderCode);
                const paymentData = res.data?.data ?? res.data;

                if (paymentData) {
                    setPayment(paymentData);
                    setStatus(paymentData.status);

                    // Các trạng thái kết thúc của giao dịch
                    const finalStatuses = ["Đã thanh toán", "Thất bại", "Hết hạn"];
                    if (finalStatuses.includes(paymentData.status)) {
                        clearInterval(intervalRef.current);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("[usePaymentPolling] Lỗi truy vấn trạng thái:", err);
                setError(err.response?.data?.message || err.message || "Lỗi kiểm tra trạng thái thanh toán");
            }
        };

        // Chạy ngay lập tức lần đầu
        checkStatus();

        // Sau đó lặp lại theo chu kỳ
        intervalRef.current = setInterval(checkStatus, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [orderCode, intervalMs, active]);

    return { status, payment, loading, error };
}
