import React, { useState, useEffect } from "react";
import { LogOut, Wallet, CreditCard, Clock, AlertTriangle } from "lucide-react";
import { checkExitFee, payCash, createVnpayCheckout } from "../../../service/paymentApi";
import { openGateFree } from "../../../service/parkingApi";
import { getMonthCards } from "../../../service/monthCardApi";
import { useNotification } from "../../../context/NotificationContext";

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
    const [loading, setLoading] = useState(false);
    const [preCheckResult, setPreCheckResult] = useState(null);
    const [vehicleType, setVehicleType] = useState("Xe máy");
    const [monthlyCards, setMonthlyCards] = useState([]);

    // Fetch danh sách thẻ tháng khi component mount để tra cứu thông tin chủ xe
    useEffect(() => {
        const fetchMonthlyCards = async () => {
            try {
                const data = await getMonthCards();
                setMonthlyCards(data || []);
            } catch (err) {
                console.warn("[ExitPaymentPanel] Lỗi tải danh sách thẻ tháng:", err);
            }
        };
        fetchMonthlyCards();
    }, []);

    const setAllLoading = (val) => {
        setLoading(val);
        if (setParentLoading) setParentLoading(val);
    };

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
                if (onPreCheckLoaded) onPreCheckLoaded(data);
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

    const handleOpenGateFree = async () => {
        if (!preCheckResult?.session?.session_id) return;
        try {
            setAllLoading(true);
            const res = await openGateFree({ sessionId: preCheckResult.session.session_id });
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
            showToast(err.response?.data?.message || err.message || "Lỗi mở barie miễn phí.", "error");
        } finally {
            setAllLoading(false);
        }
    };

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
            showToast(err.response?.data?.message || err.message || "Lỗi thanh toán tiền mặt.", "error");
        } finally {
            setAllLoading(false);
        }
    };

    const handlePayVNPay = async () => {
        if (!preCheckResult?.session?.session_id) return;
        try {
            setAllLoading(true);
            const res = await createVnpayCheckout(preCheckResult.session.session_id);
            const resData = res.data?.data ?? res.data;
            if (resData?.payment_url) {
                showToast("Đang chuyển hướng sang VNPAY...", "success");
                setTimeout(() => { window.location.href = resData.payment_url; }, 1000);
            } else {
                throw new Error("Không nhận được URL thanh toán từ VNPay.");
            }
        } catch (err) {
            showToast(err.response?.data?.message || err.message || "Lỗi khởi tạo giao dịch VNPay.", "error");
        } finally {
            setAllLoading(false);
        }
    };

    const handleReset = () => {
        setPreCheckResult(null);
        if (resetForm) resetForm();
    };

    const formatVND = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

    const isDisableActions = loading || parentLoading;
    const isMonthly = preCheckResult?.ticket_type === "Thẻ tháng";
    const isMonthlyValid = preCheckResult?.is_monthly_valid;
    const vehiclePackage = preCheckResult?.card?.vehicle_package;

    // Tra cứu tên chủ xe từ danh sách thẻ tháng đã fetch
    const getOwnerName = () => {
        const rawOwner = preCheckResult?.card?.owner_name || preCheckResult?.card?.customer_name || preCheckResult?.vehicle?.customer?.full_name || preCheckResult?.ownerName;
        if (rawOwner && rawOwner !== "---") return rawOwner;

        const cleanPlate = (preCheckResult?.vehicle?.plate_number || preCheckResult?.session?.plate_number || plateNumber || "").trim().toUpperCase();
        const cardCode = (preCheckResult?.card?.code || preCheckResult?.card?.card_code || "").trim().toUpperCase();

        if (monthlyCards.length > 0) {
            const matchedCard = monthlyCards.find(c => {
                const vPlate = (c.plate || "").trim().toUpperCase();
                const cCode = (c.cardNo || "").trim().toUpperCase();
                return (cardCode && cCode === cardCode) || (cleanPlate && vPlate === cleanPlate);
            });
            if (matchedCard) {
                return matchedCard.customer || "---";
            }
        }
        return "---";
    };

    return (
        <div style={s.container}>

            {/* ── Form nhập biển số ── */}
            <form onSubmit={handleCheckExit} style={{ width: "100%" }}>
                <p className="transaction-label" style={{ marginBottom: 2 }}>Biển số xe ra</p>
                <input
                    type="text"
                    placeholder="NHẬP BIỂN SỐ..."
                    className="transaction-plate"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    disabled={isDisableActions}
                    style={{ width: "100%", border: "2px dashed #3b82f6", outline: "none", textAlign: "center", textTransform: "uppercase", cursor: "text", marginBottom: 4 }}
                />

                {/* Loại xe selector */}
                <div className="vehicle-type-container" style={{ marginBottom: 4 }}>
                    <label className="vehicle-type-label">Loại xe:</label>
                    <div className="vehicle-type-buttons">
                        <button type="button" onClick={() => setVehicleType("Xe máy")} className={`vehicle-type-btn ${vehicleType === "Xe máy" ? "active" : ""}`} disabled={isDisableActions}>
                            <span className="material-symbols-outlined">two_wheeler</span>
                            <span>Xe máy</span>
                        </button>
                        <button type="button" onClick={() => setVehicleType("Ô tô")} className={`vehicle-type-btn ${vehicleType === "Ô tô" ? "active" : ""}`} disabled={isDisableActions}>
                            <span className="material-symbols-outlined">directions_car</span>
                            <span>Ô tô</span>
                        </button>
                    </div>
                </div>

                {/* Nút Kiểm tra xe ra */}
                <button type="submit" className="shortcut-button shortcut-primary submit-action-btn" disabled={isDisableActions || !plateNumber.trim()} style={{ height: 40, marginTop: 4 }}>
                    {loading ? (
                        <><span className="material-symbols-outlined loading-spin">hourglass_top</span>Đang xử lý...</>
                    ) : (
                        <><span className="material-symbols-outlined">search</span>Kiểm tra xe ra</>
                    )}
                </button>
            </form>

            {/* ── Kết quả sau khi kiểm tra ── */}
            {preCheckResult ? (
                <div style={s.resultStack}>

                    {/* Warning (nếu có) */}
                    {preCheckResult.warning && (
                        <div style={s.warningBox}>
                            <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0 }} />
                            <span style={s.warningText}>{preCheckResult.warning}</span>
                        </div>
                    )}

                    {/* Thẻ tháng info card */}
                    {(isMonthly || isMonthlyValid) && (
                        <div style={{ ...s.card, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                            <div style={s.cardHeader}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#16a34a" }}>verified</span>
                                <span style={{ ...s.cardTitle, color: "#166534", flex: 1 }}>Thẻ tháng</span>
                                <span style={{ ...s.badge, background: isMonthlyValid ? "#dcfce7" : "#fee2e2", color: isMonthlyValid ? "#16a34a" : "#dc2626", border: `1px solid ${isMonthlyValid ? "#bbf7d0" : "#fecaca"}` }}>
                                    {isMonthlyValid ? "Hợp lệ" : "Hết hạn"}
                                </span>
                            </div>
                            <div style={s.infoGrid}>
                                <div style={s.infoItem}>
                                    <span style={s.infoLabel}>Biển số:</span>
                                    <span style={s.infoValue}>
                                        {preCheckResult.vehicle?.plate_number || preCheckResult.session?.plate_number || plateNumber}
                                    </span>
                                </div>
                                <div style={s.infoItem}>
                                    <span style={s.infoLabel}>Chủ xe:</span>
                                    <span style={s.infoValue}>
                                        {getOwnerName()}
                                    </span>
                                </div>
                                <div style={s.infoItem}>
                                    <span style={s.infoLabel}>Mã thẻ:</span>
                                    <span style={s.infoValue}>{preCheckResult.card?.code || preCheckResult.card?.card_code || "---"}</span>
                                </div>
                                <div style={s.infoItem}>
                                    <span style={s.infoLabel}>Loại xe:</span>
                                    <span style={s.infoValue}>{preCheckResult.vehicle?.vehicle_type?.name || "---"}</span>
                                </div>
                                <div style={{ ...s.infoItem, gridColumn: "span 2" }}>
                                    <span style={s.infoLabel}>Hạn dùng:</span>
                                    <span style={{ ...s.infoValue, color: isMonthlyValid ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                                        {vehiclePackage?.end_date ? new Date(vehiclePackage.end_date).toLocaleDateString("vi-VN") : "---"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Phiên hoạt động card */}
                    <div style={s.card}>
                        <div style={s.cardHeader}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#2563eb" }}>schedule</span>
                            <span style={{ ...s.cardTitle, color: "#1e3a8a", flex: 1 }}>Thông tin phiên</span>
                            <span style={{
                                ...s.badge,
                                background: (isMonthly || isMonthlyValid) ? "#f0fdf4" : "#eff6ff",
                                color: (isMonthly || isMonthlyValid) ? "#16a34a" : "#2563eb",
                                border: `1px solid ${(isMonthly || isMonthlyValid) ? "#bbf7d0" : "#bfdbfe"}`
                            }}>
                                {preCheckResult.ticket_type || "Vé lượt"}
                            </span>
                        </div>

                        <div style={s.infoGrid}>
                            {preCheckResult.session?.entry_time && (
                                <div style={s.infoItem}>
                                    <span style={s.infoLabel}>Giờ vào:</span>
                                    <span style={s.infoValue}>{new Date(preCheckResult.session.entry_time).toLocaleString("vi-VN")}</span>
                                </div>
                            )}
                            <div style={s.infoItem}>
                                <span style={s.infoLabel}>Hiện tại:</span>
                                <span style={s.infoValue}>{new Date().toLocaleString("vi-VN")}</span>
                            </div>
                            {preCheckResult.fee_breakdown?.hours && (
                                <div style={{ ...s.infoItem, gridColumn: "span 2" }}>
                                    <span style={s.infoLabel}>Thời gian gửi:</span>
                                    <span style={s.infoValue}>{preCheckResult.fee_breakdown.hours} giờ</span>
                                </div>
                            )}
                        </div>

                        {/* Phí */}
                        <div style={s.feeRow}>
                            <span style={s.feeLabel}>Phí ước tính:</span>
                            <span style={{ ...s.feeAmt, color: preCheckResult.estimated_fee === 0 ? "#16a34a" : "#dc2626" }}>
                                {formatVND(preCheckResult.estimated_fee)}
                            </span>
                        </div>

                        {/* Action buttons */}
                        <div style={s.actions}>
                            {preCheckResult.estimated_fee === 0 ? (
                                <button type="button" onClick={handleOpenGateFree} disabled={isDisableActions} style={{ ...s.btnPrimary, background: "#16a34a", height: 38 }}>
                                    <LogOut size={13} /><span>Mở barie / Cho xe ra</span>
                                </button>
                            ) : (
                                <>
                                    <button type="button" onClick={handlePayCash} disabled={isDisableActions} style={{ ...s.btnPrimary, background: "#059669", height: 38 }}>
                                        <Wallet size={13} /><span>Thanh toán tiền mặt</span>
                                    </button>
                                    <button type="button" onClick={handlePayVNPay} disabled={isDisableActions} style={{ ...s.btnPrimary, background: "#2563eb", height: 38 }}>
                                        <CreditCard size={13} /><span>Thanh toán VNPay</span>
                                    </button>
                                </>
                            )}
                            <button type="button" onClick={handleReset} style={{ ...s.btnCancel, height: 30 }}>Hủy giao dịch</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={s.emptyCard}>
                    <Clock size={20} color="#94a3b8" />
                    <p style={s.emptyText}>Chưa có thông tin phiên đỗ xe.</p>
                    <p style={s.emptySubText}>Nhập biển số và bấm Kiểm tra.</p>
                </div>
            )}
        </div>
    );
}

const s = {
    container: { width: "100%", display: "flex", flexDirection: "column", gap: 4, minHeight: 0 },
    resultStack: { display: "flex", flexDirection: "column", gap: 4 },
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
    },
    cardHeader: { display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid #f1f5f9", paddingBottom: 4 },
    cardTitle: { fontSize: 13, fontWeight: 700 },
    badge: { fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 10, whiteSpace: "nowrap" },
    infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 6px" },
    infoItem: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },
    infoLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },
    infoValue: { fontSize: 14, color: "#0f172a", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    feeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #e2e8f0", paddingTop: 4, marginTop: 1 },
    feeLabel: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
    feeAmt: { fontSize: 18, fontWeight: 800 },
    warningBox: {
        display: "flex", alignItems: "flex-start", gap: 4,
        background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6,
        padding: "4px 6px", fontSize: 12, color: "#92400e"
    },
    warningText: { fontSize: 12, color: "#92400e" },
    actions: { display: "flex", flexDirection: "column", gap: 4, marginTop: 2 },
    btnPrimary: {
        width: "100%", color: "#fff", border: "none", borderRadius: 6,
        padding: "6px 10px", fontWeight: 700, fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 4, cursor: "pointer", transition: "opacity 0.15s ease"
    },
    btnCancel: {
        width: "100%", backgroundColor: "transparent", color: "#64748b",
        border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px",
        fontWeight: 500, fontSize: 12, cursor: "pointer"
    },
    emptyCard: {
        border: "1.5px dashed #e2e8f0", borderRadius: 8, padding: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center", background: "#f8fafc", gap: 2
    },
    emptyText: { fontSize: 13, fontWeight: 600, color: "#64748b", margin: 0 },
    emptySubText: { fontSize: 12, color: "#94a3b8", margin: 0 }
};
