import React, { useState, useEffect } from "react";
import { LogOut, Wallet, CreditCard, Clock, CheckCircle2, XCircle, AlertTriangle, Search, Loader2 } from "lucide-react";
import { checkExitFee, payCash, createVnpayCheckout } from "../../../service/paymentApi";
import { openGateFree } from "../../../service/parkingApi";
import { useNotification } from "../../../context/NotificationContext";
import { useAuth } from "../../../context/AuthContext";
import VNPayPaymentModal from "./VNPayPaymentModal";

/**
 * ExitPaymentPanel Component
 * Quản lý quy trình kiểm tra thông tin xe ra, tính toán phí và thanh toán (tiền mặt / VNPay / miễn phí).
 * Bám sát BR-TT-01 -> BR-TT-12, BR-TT-24 -> BR-TT-25
 */
export default function ExitPaymentPanel({
    staffId,
    plateNumber,
    setPlateNumber,
    exitVehicleUrl,
    exitPlateUrl,
    onSessionCompleted,
    onPreCheckLoaded,
    resetForm,
    loading: parentLoading,
    setLoading: setParentLoading
}) {
    const { showToast } = useNotification();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [preCheckResult, setPreCheckResult] = useState(null);
    const [vehicleType, setVehicleType] = useState("Xe máy");
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Trạng thái modal VNPay
    const [showVnpayModal, setShowVnpayModal] = useState(false);
    const [vnpayData, setVnpayData] = useState({
        paymentUrl: "",
        orderCode: "",
        expiresInSeconds: 600
    });

    // Đồng hồ thời gian thực cho ca trực
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const setAllLoading = (val) => {
        setLoading(val);
        if (setParentLoading) {
            setParentLoading(val);
        }
    };

    // Khi người dùng bấm kiểm tra thông tin xe ra
    const handleCheckExit = async (e) => {
        if (e) e.preventDefault();
        if (!plateNumber || !plateNumber.trim()) {
            showToast("Vui lòng nhập biển số xe cần kiểm tra.", "error");
            return;
        }

        try {
            setAllLoading(true);
            setPreCheckResult(null);

            const res = await checkExitFee(plateNumber.trim().toUpperCase());
            const data = res.data?.data ?? res.data;

            if (data) {
                setPreCheckResult(data);
                if (onPreCheckLoaded) {
                    // Truyền thông tin ảnh check-in ra ngoài để hiển thị lên camera
                    onPreCheckLoaded(data);
                }
                showToast("Kiểm tra thông tin xe ra thành công.", "success");
            } else {
                throw new Error("Không nhận được dữ liệu phản hồi.");
            }
        } catch (err) {
            console.error("[checkExitFee] Lỗi:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi kiểm tra thông tin xe ra.";
            showToast(msg, "error");
            setPreCheckResult(null);
        } finally {
            setAllLoading(false);
        }
    };

    // Xử lý khi cho xe ra trực tiếp (miễn phí - estimated_fee = 0)
    const handleOpenGateFree = async () => {
        if (!preCheckResult?.session?.session_id) return;

        try {
            setAllLoading(true);
            const res = await openGateFree({
                sessionId: preCheckResult.session.session_id
            });

            if (res.success) {
                showToast(res.message || "Đã mở barie cho xe ra miễn phí.", "success");
                if (onSessionCompleted) {
                    onSessionCompleted({
                        ...res.session,
                        fee: 0,
                        type: "OUT",
                        plate_number: plateNumber.trim().toUpperCase()
                    });
                }
                handleReset();
            } else {
                showToast(res.message || "Không thể mở barie trực tiếp.", "error");
            }
        } catch (err) {
            console.error("[openGateFree] Lỗi:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi mở barie miễn phí.";
            showToast(msg, "error");
        } finally {
            setAllLoading(false);
        }
    };

    // Xử lý thanh toán tiền mặt
    const handlePayCash = async () => {
        if (!preCheckResult?.session?.session_id) return;

        try {
            setAllLoading(true);
            const res = await payCash(preCheckResult.session.session_id);
            const data = res.data ?? res;

            if (data.payment && data.session) {
                showToast("Thanh toán tiền mặt thành công. Mở barie cho xe ra.", "success");
                if (onSessionCompleted) {
                    onSessionCompleted({
                        ...data.session,
                        fee: data.payment.amount,
                        type: "OUT",
                        plate_number: plateNumber.trim().toUpperCase()
                    });
                }
                handleReset();
            } else {
                showToast("Giao dịch tiền mặt thất bại.", "error");
            }
        } catch (err) {
            console.error("[payCash] Lỗi:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi thanh toán tiền mặt.";
            showToast(msg, "error");
        } finally {
            setAllLoading(false);
        }
    };

    // Xử lý khi click Thanh toán VNPay
    const handlePayVNPay = async () => {
        if (!preCheckResult?.session?.session_id) return;

        try {
            setAllLoading(true);
            const res = await createVnpayCheckout(preCheckResult.session.session_id);
            const resData = res.data?.data ?? res.data;

            if (resData?.payment_url) {
                setVnpayData({
                    paymentUrl: resData.payment_url,
                    orderCode: resData.order_code,
                    expiresInSeconds: resData.expires_in_seconds || 600
                });
                setShowVnpayModal(true);
                showToast("Đã khởi tạo giao dịch VNPay.", "success");
            } else {
                throw new Error("Không nhận được URL thanh toán từ VNPay.");
            }
        } catch (err) {
            console.error("[createVnpayCheckout] Lỗi:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi khởi tạo giao dịch VNPay.";
            showToast(msg, "error");
        } finally {
            setAllLoading(false);
        }
    };

    const handleReset = () => {
        setPreCheckResult(null);
        if (resetForm) {
            resetForm();
        }
    };

    const formatVND = (value) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(value || 0);
    };

    const isDisableActions = loading || parentLoading;

    return (
        <div style={styles.panelContainer}>
            {/* Form check exit */}
            <form onSubmit={handleCheckExit} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Biển số xe ra:</label>
                    <div style={styles.inputWrapper}>
                        <input
                            type="text"
                            placeholder="NHẬP BIỂN SỐ XE..."
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                            disabled={isDisableActions}
                            style={styles.plateInput}
                        />
                        <button
                            type="submit"
                            disabled={isDisableActions || !plateNumber.trim()}
                            style={styles.btnCheck}
                        >
                            {loading ? <Loader2 size={16} style={styles.spinner} /> : <Search size={16} />}
                            <span>Kiểm tra</span>
                        </button>
                    </div>
                </div>

                {/* Selector Loại xe - Giữ nguyên giao diện như mong muốn của user */}
                <div className="vehicle-type-container" style={{ marginTop: '16px' }}>
                    <label className="vehicle-type-label" style={styles.label}>Loại xe:</label>
                    <div className="vehicle-type-buttons">
                        <button
                            type="button"
                            onClick={() => setVehicleType('Xe máy')}
                            className={`vehicle-type-btn ${vehicleType === 'Xe máy' ? 'active' : ''}`}
                            disabled={isDisableActions}
                        >
                            <span className="material-symbols-outlined">two_wheeler</span>
                            <span>Xe máy</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setVehicleType('Ô tô')}
                            className={`vehicle-type-btn ${vehicleType === 'Ô tô' ? 'active' : ''}`}
                            disabled={isDisableActions}
                        >
                            <span className="material-symbols-outlined">directions_car</span>
                            <span>Ô tô</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Warning vé tháng hết hạn */}
            {preCheckResult?.warning && (
                <div style={styles.warningBox}>
                    <AlertTriangle size={18} color="#eab308" style={styles.warningIcon} />
                    <div style={styles.warningContent}>
                        <span style={styles.warningTitle}>Cảnh báo từ hệ thống:</span>
                        <p style={styles.warningText}>{preCheckResult.warning}</p>
                    </div>
                </div>
            )}

            {/* Block thông tin phiên hoạt động */}
            {preCheckResult ? (
                <div style={styles.infoCard}>
                    <h4 style={styles.infoTitle}>Thông tin phiên hoạt động</h4>
                    <div style={styles.infoGrid}>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Loại vé:</span>
                            <span style={styles.infoValHighlight}>
                                {preCheckResult.ticket_type || "Vé lượt"}
                            </span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Giờ vào:</span>
                            <span style={styles.infoVal}>
                                {preCheckResult.session?.entry_time
                                    ? new Date(preCheckResult.session.entry_time).toLocaleString("vi-VN")
                                    : "—"}
                            </span>
                        </div>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Thời gian hiện tại:</span>
                            <span style={styles.infoVal}>
                                {new Date().toLocaleString("vi-VN")}
                            </span>
                        </div>
                        {preCheckResult.fee_breakdown?.hours && (
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Số giờ gửi:</span>
                                <span style={styles.infoVal}>
                                    {preCheckResult.fee_breakdown.hours} giờ
                                </span>
                            </div>
                        )}
                        <div style={styles.feeRow}>
                            <span style={styles.feeLabel}>Phí ước tính:</span>
                            <span style={preCheckResult.estimated_fee > 0 ? styles.feeAmountAlert : styles.feeAmountFree}>
                                {formatVND(preCheckResult.estimated_fee)}
                            </span>
                        </div>
                    </div>

                    {/* Footer Action Buttons */}
                    <div style={styles.actionsBox}>
                        {preCheckResult.estimated_fee === 0 ? (
                            <button
                                type="button"
                                onClick={handleOpenGateFree}
                                disabled={isDisableActions}
                                style={styles.btnPrimaryOpen}
                            >
                                <LogOut size={16} />
                                <span>Mở barie / Cho xe ra</span>
                            </button>
                        ) : (
                            <div style={styles.btnGroup}>
                                <button
                                    type="button"
                                    onClick={handlePayCash}
                                    disabled={isDisableActions}
                                    style={styles.btnCashPay}
                                >
                                    <Wallet size={16} />
                                    <span>Thanh toán tiền mặt</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePayVNPay}
                                    disabled={isDisableActions}
                                    style={styles.btnVnpayPay}
                                >
                                    <CreditCard size={16} />
                                    <span>Thanh toán VNPay</span>
                                </button>
                            </div>
                        )}
                        <button type="button" onClick={handleReset} style={styles.btnCancel}>
                            Hủy giao dịch
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.emptyCard}>
                    <Clock size={36} color="#475569" />
                    <p style={styles.emptyText}>Chưa có thông tin phiên đỗ xe.</p>
                    <p style={styles.emptySubText}>Vui lòng quét biển số xe ra để kiểm tra phí.</p>
                </div>
            )}

            {/* Shift Information Card - Giữ thông tin ca trực luôn hiển thị ở cuối cột bên phải */}
            <div className="shift-info-card" style={{ marginTop: '16px', width: '100%' }}>
                <div className="shift-title">
                    <span className="material-symbols-outlined">badge</span>
                    <span>Thông tin ca trực</span>
                </div>
                <div className="shift-grid">
                    <div className="shift-item">
                        <span className="shift-label">Nhân viên</span>
                        <span className="shift-value">{user?.email || 'staff@gmail.com'}</span>
                    </div>
                    <div className="shift-item">
                        <span className="shift-label">Thời gian</span>
                        <span className="shift-value">{currentTime.toLocaleTimeString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            {/* VNPay Payment Modal */}
            <VNPayPaymentModal
                isOpen={showVnpayModal}
                onClose={() => setShowVnpayModal(false)}
                paymentUrl={vnpayData.paymentUrl}
                orderCode={vnpayData.orderCode}
                expiresInSeconds={vnpayData.expiresInSeconds}
                onSuccess={(payment) => {
                    setShowVnpayModal(false);
                    showToast("VNPay thanh toán thành công!", "success");
                    if (onSessionCompleted) {
                        onSessionCompleted({
                            ...preCheckResult.session,
                            status: "Hoàn thành",
                            fee: preCheckResult.estimated_fee,
                            exit_time: new Date().toISOString(),
                            type: "OUT"
                        });
                    }
                    handleReset();
                }}
                onFail={() => {
                    setShowVnpayModal(false);
                    showToast("Thanh toán thất bại hoặc hủy bỏ.", "error");
                }}
                onExpired={() => {
                    setShowVnpayModal(false);
                    showToast("Mã QR đã hết hạn thanh toán.", "warning");
                    handleReset();
                }}
                onSwitchToCash={() => {
                    setShowVnpayModal(false);
                    handlePayCash();
                }}
            />
        </div>
    );
}

const styles = {
    panelContainer: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
    },
    form: {
        width: "100%"
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    },
    label: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#94a3b8"
    },
    inputWrapper: {
        display: "flex",
        gap: "8px",
        width: "100%"
    },
    plateInput: {
        flex: 1,
        backgroundColor: "#161820",
        border: "1px solid #2d3142",
        borderRadius: "8px",
        color: "#ffffff",
        padding: "10px 12px",
        fontSize: "14px",
        fontWeight: "600",
        textTransform: "uppercase",
        textAlign: "center",
        outline: "none"
    },
    btnCheck: {
        backgroundColor: "#2563eb",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s"
    },
    warningBox: {
        display: "flex",
        gap: "10px",
        backgroundColor: "rgba(234, 179, 8, 0.1)",
        border: "1px solid rgba(234, 179, 8, 0.3)",
        borderRadius: "10px",
        padding: "12px 14px"
    },
    warningIcon: {
        flexShrink: 0
    },
    warningContent: {
        display: "flex",
        flexDirection: "column",
        gap: "2px"
    },
    warningTitle: {
        fontSize: "12px",
        fontWeight: "700",
        color: "#eab308"
    },
    warningText: {
        fontSize: "12px",
        color: "#d97706",
        margin: 0
    },
    infoCard: {
        backgroundColor: "#161820",
        border: "1px solid #2d3142",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
    },
    infoTitle: {
        margin: 0,
        fontSize: "14px",
        fontWeight: "700",
        color: "#ffffff",
        borderBottom: "1px solid #2d3142",
        paddingBottom: "8px"
    },
    infoGrid: {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "13px"
    },
    infoLabel: {
        color: "#94a3b8"
    },
    infoVal: {
        color: "#f1f5f9"
    },
    infoValHighlight: {
        color: "#f8fafc",
        fontWeight: "600",
        backgroundColor: "#2d3142",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px"
    },
    feeRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: "1px dashed #2d3142",
        paddingTop: "8px",
        marginTop: "4px"
    },
    feeLabel: {
        fontWeight: "600",
        fontSize: "13px",
        color: "#ffffff"
    },
    feeAmountAlert: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#ef4444"
    },
    feeAmountFree: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#22c55e"
    },
    actionsBox: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginTop: "8px"
    },
    btnPrimaryOpen: {
        width: "100%",
        backgroundColor: "#22c55e",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "10px",
        fontWeight: "600",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: "pointer"
    },
    btnGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    },
    btnCashPay: {
        width: "100%",
        backgroundColor: "#10b981",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "10px",
        fontWeight: "600",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: "pointer"
    },
    btnVnpayPay: {
        width: "100%",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        padding: "10px",
        fontWeight: "600",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        cursor: "pointer"
    },
    btnCancel: {
        width: "100%",
        backgroundColor: "transparent",
        color: "#94a3b8",
        border: "1px solid #2d3142",
        borderRadius: "8px",
        padding: "8px",
        fontWeight: "500",
        fontSize: "12px",
        cursor: "pointer"
    },
    emptyCard: {
        border: "2px dashed #2d3142",
        borderRadius: "12px",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
    },
    emptyText: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#94a3b8",
        margin: "12px 0 4px 0"
    },
    emptySubText: {
        fontSize: "12px",
        color: "#64748b",
        margin: 0
    },
    spinner: {
        animation: "spin 1s linear infinite"
    }
};
