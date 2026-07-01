import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getPaymentByOrderCode } from "../../../service/paymentApi";

// Inline SVG icons — không cần lucide-react
const IconSuccess = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
    </svg>
);
const IconFail = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);
const IconSpinner = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" strokeDasharray="60" strokeDashoffset="20" />
    </svg>
);

function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount || 0);
}

function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("vi-VN");
}

const PAYMENT_TYPE_LABEL = {
    "Vé lượt": "Thanh toán gửi xe",
    "Đăng ký vé tháng": "Đăng ký vé tháng",
    "Gia hạn vé tháng": "Gia hạn vé tháng",
};

const styles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
        padding: "16px",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    card: {
        width: "100%",
        maxWidth: "440px",
        background: "#1a1d29",
        border: "1px solid #2a2e3d",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    },
    iconWrap: {
        display: "flex",
        justifyContent: "center",
        marginBottom: "24px",
    },
    title: {
        fontSize: "20px",
        fontWeight: "600",
        textAlign: "center",
        color: "#fff",
        marginBottom: "8px",
    },
    subtitle: {
        textAlign: "center",
        color: "#94a3b8",
        marginBottom: "24px",
        fontSize: "14px",
    },
    infoBox: {
        background: "#12141c",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "24px",
    },
    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid #1e2235",
        fontSize: "14px",
    },
    rowLast: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        fontSize: "14px",
    },
    label: { color: "#64748b" },
    value: { color: "#e2e8f0", fontWeight: "500" },
    valueHighlight: { color: "#fff", fontWeight: "700", fontSize: "16px" },
    valueSuccess: { color: "#22c55e", fontWeight: "600" },
    valueFail: { color: "#ef4444", fontWeight: "600" },
    actions: { display: "flex", gap: "12px" },
    btnSecondary: {
        flex: 1,
        padding: "10px",
        borderRadius: "8px",
        background: "#2a2e3d",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        transition: "background 0.2s",
    },
    btnPrimary: {
        flex: 1,
        padding: "10px",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "500",
        transition: "background 0.2s",
    },
    spinnerWrap: {
        display: "flex",
        justifyContent: "center",
        padding: "24px 0",
    },
    errorText: {
        textAlign: "center",
        color: "#64748b",
        fontSize: "14px",
        marginBottom: "24px",
    },
};

export default function PaymentResultPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderCode = searchParams.get("orderCode");
    const status = searchParams.get("status"); // 'success' | 'failed'

    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!orderCode) {
            setError("Thiếu mã giao dịch");
            setLoading(false);
            return;
        }

        getPaymentByOrderCode(orderCode)
            .then((res) => setPayment(res.data?.data ?? res.data))
            .catch(() => setError("Không tìm thấy thông tin giao dịch"))
            .finally(() => setLoading(false));
    }, [orderCode]);

    const isSuccess = status === "success";

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Icon trạng thái */}
                <div style={styles.iconWrap}>
                    {isSuccess ? <IconSuccess /> : <IconFail />}
                </div>

                <h1 style={styles.title}>
                    {isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại"}
                </h1>
                <p style={styles.subtitle}>
                    {isSuccess
                        ? "Giao dịch của bạn đã được xử lý thành công."
                        : "Giao dịch không thành công hoặc đã bị hủy. Vui lòng thử lại."}
                </p>

                {loading && (
                    <div style={styles.spinnerWrap}>
                        <IconSpinner />
                    </div>
                )}

                {!loading && error && (
                    <p style={styles.errorText}>{error}</p>
                )}

                {!loading && payment && (
                    <div style={styles.infoBox}>
                        <div style={styles.row}>
                            <span style={styles.label}>Mã giao dịch</span>
                            <span style={styles.value}>{payment.order_code || "—"}</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>Loại giao dịch</span>
                            <span style={styles.value}>
                                {PAYMENT_TYPE_LABEL[payment.payment_type] || payment.payment_type || "—"}
                            </span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>Số tiền</span>
                            <span style={styles.valueHighlight}>{formatCurrency(payment.amount)}</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>Phương thức</span>
                            <span style={styles.value}>
                                VNPay{payment.bank_code ? ` (${payment.bank_code})` : ""}
                            </span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>Thời gian</span>
                            <span style={styles.value}>{formatDateTime(payment.paid_at)}</span>
                        </div>
                        <div style={styles.rowLast}>
                            <span style={styles.label}>Trạng thái</span>
                            <span style={payment.status === "Đã thanh toán" ? styles.valueSuccess : styles.valueFail}>
                                {payment.status || "—"}
                            </span>
                        </div>
                    </div>
                )}

                <div style={styles.actions}>
                    <button
                        style={styles.btnSecondary}
                        onClick={() => navigate("/login/dashboard")}
                        onMouseEnter={e => e.target.style.background = "#343849"}
                        onMouseLeave={e => e.target.style.background = "#2a2e3d"}
                    >
                        Về trang chủ
                    </button>
                    {!isSuccess && (
                        <button
                            style={styles.btnPrimary}
                            onClick={() => navigate(-1)}
                            onMouseEnter={e => e.target.style.background = "#1d4ed8"}
                            onMouseLeave={e => e.target.style.background = "#2563eb"}
                        >
                            Thử lại
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}