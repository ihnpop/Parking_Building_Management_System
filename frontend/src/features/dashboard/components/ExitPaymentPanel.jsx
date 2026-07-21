import React, { useState, useEffect, useCallback } from "react";
import { LogOut, Wallet, CreditCard, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { checkExitFee, payCash, createVnpayCheckout } from "../../../service/paymentApi";
import { openGateFree } from "../../../service/parkingApi";
import { getMonthCards } from "../../../service/monthCardApi";
import { useNotification } from "../../../context/NotificationContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "exit_pending_vnpay";
const PRECHECK_KEY = "exit_precheck_state";
const EXPIRY_MS = 15 * 60 * 1000; // 15 phút

// ─── Storage helpers — VNPay pending ─────────────────────────────────────────
const savePendingVNPay = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    } catch (e) {
        console.warn("[ExitPaymentPanel] Không thể lưu trạng thái VNPay:", e);
    }
};

const loadPendingVNPay = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - (data.savedAt || 0) > EXPIRY_MS) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return data;
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

const clearPendingVNPay = () => localStorage.removeItem(STORAGE_KEY);

// ─── Storage helpers — preCheckResult state ───────────────────────────────────
const savePrecheckState = (preCheckResult, plate) => {
    try {
        localStorage.setItem(PRECHECK_KEY, JSON.stringify({
            preCheckResult,
            plateNumber: plate,
            savedAt: Date.now()
        }));
    } catch (e) {
        console.warn("[ExitPaymentPanel] Không thể lưu precheck state:", e);
    }
};

const loadPrecheckState = () => {
    try {
        const raw = localStorage.getItem(PRECHECK_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - (data.savedAt || 0) > EXPIRY_MS) {
            localStorage.removeItem(PRECHECK_KEY);
            return null;
        }
        return data; // { preCheckResult, plateNumber, savedAt }
    } catch (e) {
        localStorage.removeItem(PRECHECK_KEY);
        return null;
    }
};

const clearPrecheckState = () => localStorage.removeItem(PRECHECK_KEY);

// ─── Countdown helper ─────────────────────────────────────────────────────────
const getRemainingSeconds = (savedAt) => {
    const elapsed = Date.now() - (savedAt || 0);
    return Math.max(0, Math.floor((EXPIRY_MS - elapsed) / 1000));
};

// ─── VNPay Pending Panel ───────────────────────────────────────────────────────
function VNPayPendingPanel({ orderCode, amount, plateNumber, paymentUrl, savedAt, onContinue, onDefer, onExpired }) {
    const [remaining, setRemaining] = useState(() => getRemainingSeconds(savedAt));
    const formatVND = (v) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);

    useEffect(() => {
        if (remaining <= 0) { onExpired?.(); return; }
        const timer = setInterval(() => {
            const secs = getRemainingSeconds(savedAt);
            setRemaining(secs);
            if (secs <= 0) { clearInterval(timer); onExpired?.(); }
        }, 1000);
        return () => clearInterval(timer);
    }, [savedAt, onExpired]);

    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    const isUrgent = remaining <= 60;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Header trạng thái */}
            <div style={{
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: 10, padding: "10px 12px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#b45309" }}>credit_card</span>
                    <span style={{ fontWeight: 700, color: "#b45309", fontSize: 13 }}>
                        Đang chờ thanh toán qua VNPay
                    </span>
                    {/* Đếm ngược */}
                    <span style={{
                        marginLeft: "auto", fontFamily: "monospace",
                        fontSize: 13, fontWeight: 700,
                        color: isUrgent ? "#dc2626" : "#b45309",
                        background: isUrgent ? "#fee2e2" : "#fef3c7",
                        border: `1px solid ${isUrgent ? "#fca5a5" : "#fde68a"}`,
                        borderRadius: 6, padding: "1px 7px",
                        animation: isUrgent ? "pulse 1s ease-in-out infinite" : "none"
                    }}>
                        ⏱ {mm}:{ss}
                    </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12 }}>
                    <span style={{ color: "#64748b" }}>Mã giao dịch</span>
                    <span style={{ fontWeight: 600, color: "#1e293b", fontFamily: "monospace", fontSize: 11 }}>{orderCode}</span>
                    <span style={{ color: "#64748b" }}>Số tiền</span>
                    <span style={{ fontWeight: 700, color: "#b45309" }}>{formatVND(amount)}</span>
                    <span style={{ color: "#64748b" }}>Biển số xe</span>
                    <span style={{ fontWeight: 700, color: "#0284c7" }}>{plateNumber}</span>
                </div>
            </div>

            {/* Gợi ý */}
            <div style={{
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#64748b",
                display: "flex", alignItems: "center", gap: 5
            }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                Tab thanh toán VNPay đã được mở. Sau khi hoàn tất, giao dịch sẽ tự động được xác nhận.
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <button
                    type="button"
                    onClick={onDefer}
                    style={{
                        flex: 1, padding: "8px 6px", borderRadius: 8,
                        background: "#f8fafc", border: "1px solid #cbd5e1",
                        color: "#64748b", cursor: "pointer", fontWeight: 500, fontSize: 12
                    }}
                >
                    Để sau
                </button>
                <button
                    type="button"
                    onClick={onContinue}
                    disabled={!paymentUrl}
                    style={{
                        flex: 2, padding: "8px 10px", borderRadius: 8,
                        background: paymentUrl ? "#f97316" : "#cbd5e1",
                        color: "#fff", border: "none",
                        cursor: paymentUrl ? "pointer" : "default",
                        fontWeight: 600, fontSize: 12,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                    Tiếp tục thanh toán VNPay
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
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

    // VNPay pending state
    const [vnpayPending, setVnpayPending] = useState(null); // { orderCode, amount, plateNumber, paymentUrl, savedAt }

    // ── Khôi phục trạng thái khi component mount ──
    // Lưu ý: KHÔNG tự động hiện lại VNPay pending khi mount để tránh hiển thị
    // đơn thanh toán "Chờ thanh toán" khi người dùng chưa nhập biển số.
    // VNPay pending chỉ được phục hồi khi người dùng nhập đúng biển số khớp.
    useEffect(() => {
        // Chỉ phục hồi kết quả kiểm tra xe ra (preCheckResult) nếu có
        const saved = loadPrecheckState();
        if (saved?.preCheckResult) {
            setPreCheckResult(saved.preCheckResult);
            if (saved.plateNumber && setPlateNumber) setPlateNumber(saved.plateNumber);
            if (onPreCheckLoaded) onPreCheckLoaded(saved.preCheckResult);
        }
    }, []);


    // ── Fetch thẻ tháng ──
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

    // ── Kiểm tra xe ra ──
    const handleCheckExit = async (e) => {
        if (e) e.preventDefault();
        const trimmedPlate = (plateNumber || "").trim().toUpperCase();
        if (!trimmedPlate) {
            showToast("Vui lòng nhập biển số xe cần kiểm tra.", "error");
            return;
        }

        // ✔ Kiểm tra localStorage trước khi gọi API:
        // Chỉ chặn nếu đơn VNPay đang chờ ĐÚNG BIỂN SỐ này
        const existingPending = loadPendingVNPay();
        if (existingPending && existingPending.plateNumber === trimmedPlate) {
            // Cùng biển số → hiển thị màn hình tiếp tục thanh toán (không gọi API lại)
            setVnpayPending(existingPending);
            showToast(
                `Xe ${trimmedPlate} đã có đơn VNPay đang chờ. Vui lòng tiếp tục hoặc hủy giao dịch cũ.`,
                "info"
            );
            return;
        }
        // Khác biển số (hoặc không có pending) → tiến hành kiểm tra bình thường
        try {
            setAllLoading(true);
            setPreCheckResult(null);
            const res = await checkExitFee(trimmedPlate);
            const data = res.data?.data ?? res.data;
            if (data) {
                setPreCheckResult(data);
                // Lưu INLINE — trimmedPlate luôn đúng, không bị race với parent state
                savePrecheckState(data, trimmedPlate);
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

    // ── Mở barie miễn phí ──
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

    // ── Thanh toán tiền mặt ──
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

    // ── Thanh toán VNPay — mở tab mới, giữ trạng thái pending ──
    const handlePayVNPay = async () => {
        if (!preCheckResult?.session?.session_id) return;
        try {
            setAllLoading(true);
            const res = await createVnpayCheckout(preCheckResult.session.session_id);
            const resData = res.data?.data ?? res.data;
            if (resData?.payment_url) {
                const pendingData = {
                    orderCode: resData.order_code || resData.orderCode || `PK${Date.now()}`,
                    amount: preCheckResult.estimated_fee,
                    plateNumber: plateNumber.trim().toUpperCase(),
                    paymentUrl: resData.payment_url,
                    savedAt: Date.now()
                };
                // Lưu vào localStorage (15 phút)
                savePendingVNPay(pendingData);
                // Mở tab mới thay vì redirect toàn trang
                window.open(resData.payment_url, "_blank");
                showToast("Đã mở trang thanh toán VNPay trong tab mới.", "success");
                // Chuyển sang màn hình đang chờ VNPay (PRECHECK không còn cần vì VNPay pending đảm nhiệm)
                clearPrecheckState();
                setVnpayPending(pendingData);
                setPreCheckResult(null);
            } else {
                throw new Error("Không nhận được URL thanh toán từ VNPay.");
            }
        } catch (err) {
            showToast(err.response?.data?.message || err.message || "Lỗi khởi tạo giao dịch VNPay.", "error");
        } finally {
            setAllLoading(false);
        }
    };

    // ── Tiếp tục thanh toán VNPay ──
    const handleContinueVNPay = () => {
        if (vnpayPending?.paymentUrl) {
            window.open(vnpayPending.paymentUrl, "_blank");
        }
    };

    // ── Để sau — đóng màn hình chờ nhưng GIỮ STORAGE_KEY — không reset form cha ──
    const handleDeferVNPay = () => {
        const plate = vnpayPending?.plateNumber || "xe này";
        setVnpayPending(null);
        setPreCheckResult(null);
        clearPrecheckState(); // VNPay pending đảm nhiệm, không cần precheck nữa
        // Không gọi resetForm() — nó sẽ xóa plateNumber của parent
        showToast(
            `Giao dịch VNPay cho xe ${plate} vẫn đang chờ. Nhập lại biển số đó và bấm Kiểm tra xe ra để tiếp tục.`,
            "info"
        );
    };

    // ── Giao dịch hết hạn (15 phút) ──
    const handleVNPayExpired = useCallback(() => {
        clearPendingVNPay();
        clearPrecheckState();
        setVnpayPending(null);
        setPreCheckResult(null);
        if (resetForm) resetForm();
        showToast("Giao dịch VNPay đã hết hạn (15 phút). Vui lòng kiểm tra xe lại.", "error");
    }, [resetForm, showToast]);

    // ── Reset toàn bộ ──
    const handleReset = () => {
        clearPendingVNPay();
        clearPrecheckState();
        setVnpayPending(null);
        setPreCheckResult(null);
        if (resetForm) resetForm();
    };

    const formatVND = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

    // Helper định dạng thời gian gửi từ dạng số thập phân (VD: 3.44 giờ) hoặc mốc thời gian entry_time sang "X giờ Y phút"
    const formatDurationText = (hoursVal, entryTimeVal) => {
        let totalMinutes = 0;

        if (entryTimeVal) {
            let entryStr = entryTimeVal;
            if (typeof entryStr === "string" && !entryStr.endsWith("Z") && !entryStr.match(/[+-]\d{2}(:\d{2})?$/)) {
                entryStr += "Z";
            }
            const entry = new Date(entryStr);
            if (!isNaN(entry.getTime())) {
                const diffMs = Math.max(0, Date.now() - entry.getTime());
                totalMinutes = Math.floor(diffMs / (1000 * 60));
            }
        }

        if (totalMinutes === 0 && hoursVal !== undefined && hoursVal !== null) {
            let cleanVal = hoursVal;
            if (typeof cleanVal === 'string') {
                cleanVal = cleanVal.replace(/[^0-9.]/g, '');
            }
            const numHours = typeof cleanVal === 'number' ? cleanVal : parseFloat(cleanVal);
            if (!isNaN(numHours) && numHours > 0) {
                totalMinutes = Math.round(numHours * 60);
            }
        }

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0 && minutes > 0) {
            return `${hours} giờ ${minutes} phút`;
        } else if (hours > 0) {
            return `${hours} giờ 0 phút`;
        } else {
            return `${minutes} phút`;
        }
    };

    const isDisableActions = loading || parentLoading;
    const isMonthly = preCheckResult?.ticket_type === "Thẻ tháng";
    const isMonthlyValid = preCheckResult?.is_monthly_valid;
    const vehiclePackage = preCheckResult?.card?.vehicle_package;

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
            if (matchedCard) return matchedCard.customer || "---";
        }
        return "---";
    };

    return (
        <div style={s.container}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>

            {/* ── TRẠNG THÁI: Đang chờ VNPay (ưu tiên hiển thị) ── */}
            {vnpayPending ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Banner thông báo có pending */}
                    <div style={{
                        background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
                        borderRadius: 10, padding: "8px 12px",
                        display: "flex", alignItems: "center", gap: 7
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff" }}>payment</span>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Giao dịch VNPay đang chờ</div>
                            <div style={{ fontSize: 11, color: "#bfdbfe" }}>Biển số: <strong>{vnpayPending.plateNumber}</strong></div>
                        </div>
                    </div>

                    <VNPayPendingPanel
                        orderCode={vnpayPending.orderCode}
                        amount={vnpayPending.amount}
                        plateNumber={vnpayPending.plateNumber}
                        paymentUrl={vnpayPending.paymentUrl}
                        savedAt={vnpayPending.savedAt}
                        onContinue={handleContinueVNPay}
                        onDefer={handleDeferVNPay}
                        onExpired={handleVNPayExpired}
                    />

                    {/* Kiểm tra xe khác */}
                    <button
                        type="button"
                        onClick={handleReset}
                        style={{
                            ...s.btnCancel, height: 28, fontSize: 11,
                            color: "#dc2626", borderColor: "#fca5a5"
                        }}
                    >
                        Hủy giao dịch VNPay & Kiểm tra xe mới
                    </button>
                </div>
            ) : (
                <>
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
                                            <span style={s.infoValue}>{preCheckResult.vehicle?.plate_number || preCheckResult.session?.plate_number || plateNumber}</span>
                                        </div>
                                        <div style={s.infoItem}>
                                            <span style={s.infoLabel}>Chủ xe:</span>
                                            <span style={s.infoValue}>{getOwnerName()}</span>
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
                                    {(preCheckResult.session?.entry_time || preCheckResult.fee_breakdown?.hours) && (
                                        <div style={{ ...s.infoItem, gridColumn: "span 2" }}>
                                            <span style={s.infoLabel}>Thời gian gửi:</span>
                                            <span style={s.infoValue}>
                                                {formatDurationText(preCheckResult.fee_breakdown?.hours, preCheckResult.session?.entry_time)}
                                            </span>
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
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        style={{
                                            ...s.btnCancel,
                                            background: "#db1f1f",
                                            color: "#fff",
                                            height: 38,
                                        }}
                                    >
                                        Hủy giao dịch
                                    </button>
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
                </>
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
