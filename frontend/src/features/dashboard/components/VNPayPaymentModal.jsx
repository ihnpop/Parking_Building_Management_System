import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Loader2, CheckCircle2, XCircle, Clock, RotateCcw, X } from "lucide-react";
import { usePaymentPolling } from "../../../hooks/usePaymentPolling";

/**
 * Component hiển thị QR Code và trạng thái thanh toán VNPay.
 * Có đếm ngược thời gian và polling kiểm tra trạng thái tự động.
 */
export default function VNPayPaymentModal({
    isOpen,
    onClose,
    paymentUrl,
    orderCode,
    expiresInSeconds = 600,
    onSuccess,
    onFail,
    onExpired,
    onSwitchToCash
}) {
    const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
    const { status, payment, loading, error } = usePaymentPolling(orderCode, 3000, isOpen);

    // Xử lý đếm ngược thời gian
    useEffect(() => {
        if (!isOpen || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (onExpired) onExpired();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, timeLeft, onExpired]);

    // Đồng bộ trạng thái từ hook polling sang callbacks
    useEffect(() => {
        if (!isOpen) return;

        if (status === "Đã thanh toán") {
            const timeout = setTimeout(() => {
                if (onSuccess) onSuccess(payment);
            }, 2000);
            return () => clearTimeout(timeout);
        }

        if (status === "Thất bại") {
            if (onFail) onFail(payment);
        }

        if (status === "Hết hạn") {
            if (onExpired) onExpired();
        }
    }, [status, isOpen, onSuccess, onFail, onExpired, payment]);

    if (!isOpen) return null;

    // Helper format thời gian mm:ss
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.titleWrap}>
                        <QrCode size={20} color="#2563eb" />
                        <span style={styles.titleText}>Quét mã thanh toán VNPay</span>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose} title="Đóng modal (Vẫn giữ polling ngầm)">
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={styles.body}>
                    {status === "Đã thanh toán" ? (
                        <div style={styles.statusBox}>
                            <CheckCircle2 size={64} color="#22c55e" style={styles.animateBounce} />
                            <p style={styles.statusTextSuccess}>Thanh toán thành công!</p>
                            <p style={styles.subStatusText}>Hệ thống đang chuẩn bị mở cổng...</p>
                        </div>
                    ) : status === "Thất bại" ? (
                        <div style={styles.statusBox}>
                            <XCircle size={64} color="#ef4444" />
                            <p style={styles.statusTextError}>Thanh toán thất bại</p>
                            <p style={styles.subStatusText}>Vui lòng thử lại hoặc chọn cách khác.</p>
                            <div style={styles.actionRow}>
                                <button style={styles.btnRetry} onClick={onFail}>
                                    <RotateCcw size={16} />
                                    Thử lại
                                </button>
                                <button style={styles.btnCash} onClick={onSwitchToCash}>
                                    Thanh toán tiền mặt
                                </button>
                            </div>
                        </div>
                    ) : timeLeft <= 0 || status === "Hết hạn" ? (
                        <div style={styles.statusBox}>
                            <XCircle size={64} color="#eab308" />
                            <p style={styles.statusTextWarning}>Hết thời gian thanh toán</p>
                            <p style={styles.subStatusText}>Vui lòng khởi tạo lại giao dịch hoặc dùng tiền mặt.</p>
                            <div style={styles.actionRow}>
                                <button style={styles.btnRetry} onClick={onFail}>
                                    <RotateCcw size={16} />
                                    Tạo lại mã
                                </button>
                                <button style={styles.btnCash} onClick={onSwitchToCash}>
                                    Thanh toán tiền mặt
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* QR Code Canvas */}
                            <div style={styles.qrContainer}>
                                {paymentUrl ? (
                                    <QRCodeCanvas
                                        value={paymentUrl}
                                        size={200}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                        level="H"
                                        includeMargin={true}
                                    />
                                ) : (
                                    <div style={styles.qrPlaceholder}>
                                        <Loader2 size={32} style={styles.spinner} />
                                        <span>Đang tạo link...</span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={styles.infoWrapper}>
                                <div style={styles.timerRow}>
                                    <Clock size={16} color="#94a3b8" />
                                    <span style={styles.timerLabel}>Mã hết hiệu lực sau:</span>
                                    <span style={timeLeft < 60 ? styles.timerValueAlert : styles.timerValue}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                                <div style={styles.orderDetail}>
                                    <div style={styles.detailRow}>
                                        <span style={styles.detailLabel}>Mã đơn hàng:</span>
                                        <span style={styles.detailVal}>{orderCode || "—"}</span>
                                    </div>
                                    <div style={styles.detailRow}>
                                        <span style={styles.detailLabel}>Số tiền thu:</span>
                                        <span style={styles.amountVal}>
                                            {payment?.amount
                                                ? new Intl.NumberFormat("vi-VN", {
                                                      style: "currency",
                                                      currency: "VND"
                                                  }).format(payment.amount)
                                                : "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Loader */}
                            <div style={styles.loaderStatus}>
                                <Loader2 size={16} style={styles.spinner} />
                                <span>Đang chờ khách thanh toán...</span>
                            </div>
                            
                            <div style={styles.actionsFooter}>
                                <button style={styles.btnSecondary} onClick={onSwitchToCash}>
                                    Chuyển sang tiền mặt
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Inline styling mapping since project does not use Tailwind for custom dialog overlays,
// matching the existing premium dark theme (#1a1a1a / #111 with bright accents).
const styles = {
    overlay: {
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)"
    },
    container: {
        width: "90%",
        maxWidth: "400px",
        backgroundColor: "#1c1e27",
        border: "1px solid #2d3142",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #2d3142",
        backgroundColor: "#161820"
    },
    titleWrap: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    titleText: {
        color: "#ffffff",
        fontWeight: "600",
        fontSize: "15px"
    },
    closeBtn: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s"
    },
    body: {
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#f8fafc"
    },
    qrContainer: {
        backgroundColor: "#ffffff",
        padding: "12px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        marginBottom: "20px"
    },
    qrPlaceholder: {
        width: "200px",
        height: "200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px",
        color: "#64748b",
        fontSize: "13px"
    },
    infoWrapper: {
        width: "100%",
        backgroundColor: "#161820",
        borderRadius: "10px",
        padding: "12px 16px",
        border: "1px solid #2d3142",
        marginBottom: "20px"
    },
    timerRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        borderBottom: "1px solid #2d3142",
        paddingBottom: "8px",
        marginBottom: "8px"
    },
    timerLabel: {
        fontSize: "13px",
        color: "#94a3b8"
    },
    timerValue: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#3b82f6"
    },
    timerValueAlert: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#ef4444"
    },
    orderDetail: {
        display: "flex",
        flexDirection: "column",
        gap: "6px"
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "13px"
    },
    detailLabel: {
        color: "#94a3b8"
    },
    detailVal: {
        color: "#f1f5f9",
        fontFamily: "monospace"
    },
    amountVal: {
        color: "#10b981",
        fontWeight: "600"
    },
    loaderStatus: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        color: "#94a3b8",
        marginBottom: "16px"
    },
    statusBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 0",
        textAlign: "center",
        width: "100%"
    },
    statusTextSuccess: {
        color: "#22c55e",
        fontWeight: "600",
        fontSize: "18px",
        marginTop: "16px",
        marginBottom: "4px"
    },
    statusTextError: {
        color: "#ef4444",
        fontWeight: "600",
        fontSize: "18px",
        marginTop: "16px",
        marginBottom: "4px"
    },
    statusTextWarning: {
        color: "#eab308",
        fontWeight: "600",
        fontSize: "18px",
        marginTop: "16px",
        marginBottom: "4px"
    },
    subStatusText: {
        color: "#94a3b8",
        fontSize: "13px",
        marginBottom: "20px"
    },
    actionRow: {
        display: "flex",
        gap: "12px",
        width: "100%"
    },
    btnRetry: {
        flex: 1,
        backgroundColor: "#3b82f6",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "10px",
        fontWeight: "500",
        fontSize: "13px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px"
    },
    btnCash: {
        flex: 1,
        backgroundColor: "#10b981",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "10px",
        fontWeight: "500",
        fontSize: "13px",
        cursor: "pointer"
    },
    actionsFooter: {
        width: "100%",
        borderTop: "1px solid #2d3142",
        paddingTop: "16px",
        display: "flex"
    },
    btnSecondary: {
        width: "100%",
        backgroundColor: "#2d3142",
        color: "#f1f5f9",
        border: "none",
        borderRadius: "8px",
        padding: "10px",
        fontWeight: "500",
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.2s"
    },
    spinner: {
        animation: "spin 1s linear infinite"
    },
    animateBounce: {
        animation: "bounce 1s infinite"
    }
};

// Add standard global styles if not already defined for animations
if (typeof document !== "undefined") {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
    `;
    document.head.appendChild(styleEl);
}
