import React, { useState, useEffect, useCallback } from "react";
import { LogOut, Wallet, CreditCard, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { checkExitFee, payCash, createVnpayCheckout } from "../../../service/paymentApi";
import { openGateFree } from "../../../service/parkingApi";
import { getMonthCards } from "../../../service/monthCardApi";
import { getLostCards, confirmLostTurnCardCash } from "../../../service/cardApi";
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
function VNPayPendingPanel({ orderCode, amount, plateNumber, paymentUrl, savedAt, onContinue, onDefer, onExpired, onCancel }) {
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
        <div className="epp-vnpay-pending">
            {/* Header trạng thái */}
            <div className="epp-status-header">
                <div className="epp-status-title-row">
                    <span className="material-symbols-outlined">credit_card</span>
                    <span className="epp-status-text">
                        Đang chờ thanh toán qua VNPay
                    </span>
                    {/* Đếm ngược */}
                    <span className={`epp-countdown ${isUrgent ? "epp-countdown--urgent" : ""}`}>
                        ⏱ {mm}:{ss}
                    </span>
                </div>

                <div className="epp-status-grid">
                    <span className="epp-status-grid-label">Mã giao dịch</span>
                    <span className="epp-status-grid-value epp-status-grid-value--code">{orderCode}</span>
                    <span className="epp-status-grid-label">Số tiền</span>
                    <span className="epp-status-grid-value epp-status-grid-value--price">{formatVND(amount)}</span>
                    <span className="epp-status-grid-label">Biển số xe</span>
                    <span className="epp-status-grid-value epp-status-grid-value--plate">{plateNumber}</span>
                </div>
            </div>

            {/* Gợi ý */}
            <div className="epp-info-tip">
                <span className="material-symbols-outlined">info</span>
                Tab thanh toán VNPay đã được mở. Sau khi hoàn tất, giao dịch sẽ tự động được xác nhận.
            </div>

            {/* Buttons */}
            <div className="epp-btn-row">
                <button
                    type="button"
                    onClick={onDefer}
                    className="epp-btn-defer"
                >
                    Để sau
                </button>
                <button
                    type="button"
                    onClick={onContinue}
                    disabled={!paymentUrl}
                    className="epp-btn-continue"
                >
                    <span className="material-symbols-outlined">open_in_new</span>
                    Tiếp tục thanh toán VNPay
                </button>
            </div>

            {/* Hủy giao dịch (nằm bên trong card) */}
            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="epp-btn-cancel-vnpay"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                    Hủy giao dịch VNPay & Kiểm tra xe mới
                </button>
            )}
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
    // Lost Card Report state for handling lost card exit confirmation
    const [lostCardReport, setLostCardReport] = useState(null);

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
            setLostCardReport(null);
            const res = await checkExitFee(trimmedPlate);
            const data = res.data?.data ?? res.data;
            if (data) {
                setPreCheckResult(data);
                savePrecheckState(data, trimmedPlate);
                if (onPreCheckLoaded) onPreCheckLoaded(data);

                // 🔴 Nếu xe thuộc luồng báo mất thẻ → Tìm báo cáo mất thẻ tương ứng
                if (data.ticket_type === "Mất thẻ") {
                    try {
                        const lostCardsList = await getLostCards();
                        const foundReport = Array.isArray(lostCardsList)
                            ? lostCardsList.find(r => (r.plate_number || '').trim().toUpperCase() === trimmedPlate && r.status !== 'Đã hủy (tạo nhầm)')
                            : null;
                        setLostCardReport(foundReport || null);
                    } catch (errReport) {
                        console.warn("[ExitPaymentPanel] Lỗi tra cứu báo cáo mất thẻ:", errReport);
                    }
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
            setLostCardReport(null);
        } finally {
            setAllLoading(false);
        }
    };

    // ── Cho xe mất thẻ xuất bến (Mở barie & báo giao dịch vừa thực hiện) ──
    const handleConfirmLostCardExit = async () => {
        if (!preCheckResult?.session?.session_id) return;
        try {
            setAllLoading(true);

            const pendingPayment = lostCardReport?.pendingPayment;
            const orderCode = pendingPayment?.orderCode || lostCardReport?.payment_order_code;

            // Nếu report status trên backend chưa 'Đã xong' (tức là Staff chỉ mới tạo pendingPayment ở trang Báo mất)
            // thì TẠI ĐÂY (khi bấm Mở barie) ta gọi confirmLostTurnCardCash để CHÍNH THỨC đóng phiên gửi xe và cập nhật xe đã ra.
            const finalFee = lostCardReport?.parking_fee || 0;

            let sessionResult = preCheckResult.session;

            const openGatePayload = {
                sessionId: preCheckResult.session.session_id,
                finalFee,
                ticketType: preCheckResult.ticket_type,
                vehicleTypeId: preCheckResult.vehicle?.vehicle_type_id || preCheckResult.session?.vehicle_type_id
            };

            if (orderCode && lostCardReport?._backendStatus !== 'Đã xong') {
                await confirmLostTurnCardCash(orderCode);
                const res = await openGateFree(openGatePayload);
                if (res?.session) sessionResult = res.session;
                showToast("Đã đóng phiên gửi xe và mở barie cho xe xuất bến thành công!", "success");
            } else {
                // Đơn báo mất đã thanh toán hoàn tất (VNPay) -> Gọi mở barie cho xe ra
                const res = await openGateFree(openGatePayload);
                if (res?.session) sessionResult = res.session;
                showToast(res.message || "Đã mở barie cho xe ra bãi thành công.", "success");
            }

            // 🟢 Số tiền trong giao dịch vừa thực hiện trên màn hình Staff CHỈ hiển thị phí giữ xe
            const parkingFeeOnly = sessionResult?.final_fee ?? preCheckResult.estimated_fee ?? 0;

            if (onSessionCompleted) {
                onSessionCompleted({
                    ...sessionResult,
                    fee: parkingFeeOnly,
                    type: "OUT",
                    plate_number: plateNumber.trim().toUpperCase()
                });
            }
            handleReset();
        } catch (err) {
            console.error("[handleConfirmLostCardExit] Lỗi:", err);
            showToast(err.response?.data?.message || err.message || "Lỗi khi xử lý cho xe ra.", "error");
        } finally {
            setAllLoading(false);
        }
    };

    // ── Mở barie miễn phí ──
    const handleOpenGateFree = async () => {
        if (!preCheckResult?.session?.session_id) return;

        try {
            setAllLoading(true);
            const res = await openGateFree({
                sessionId: preCheckResult.session.session_id,
                ticketType: preCheckResult.ticket_type,
                vehicleTypeId: preCheckResult.vehicle?.vehicle_type_id || preCheckResult.session?.vehicle_type_id
            });
            showToast(res.message || "Đã mở barie cho xe ra bãi thành công.", "success");

            if (onSessionCompleted) {
                onSessionCompleted({
                    ...res.session,
                    fee: 0,
                    type: "OUT",
                    plate_number: plateNumber.trim().toUpperCase()
                });
            }
            handleReset();
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
        setLostCardReport(null);
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
        <div className="epp-container">
            {/* ── TRẠNG THÁI: Đang chờ VNPay (ưu tiên hiển thị) ── */}
            {vnpayPending ? (
                <div className="epp-result-stack">
                    {/* Banner thông báo có pending */}
                    <div className="epp-vnpay-pending-banner">
                        <span className="material-symbols-outlined">payment</span>
                        <div>
                            <div className="epp-vnpay-pending-banner-title">Giao dịch VNPay đang chờ</div>
                            <div className="epp-vnpay-pending-banner-sub">Biển số: <strong>{vnpayPending.plateNumber}</strong></div>
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
                        onCancel={handleReset}
                    />
                </div>
            ) : (
                <>
                    {/* ── Form nhập biển số ── */}
                    <form onSubmit={handleCheckExit} className="epp-form">
                        <p className="transaction-label epp-label-spacing">Biển số xe ra</p>
                        <input
                            type="text"
                            placeholder="NHẬP BIỂN SỐ..."
                            className="transaction-plate epp-plate-input"
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                            disabled={isDisableActions}
                        />

                        {/* Loại xe selector */}
                        <div className="vehicle-type-container epp-vehicle-type-container">
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
                        <button type="submit" className="shortcut-button shortcut-primary submit-action-btn epp-submit-btn" disabled={isDisableActions || !plateNumber.trim()}>
                            {loading ? (
                                <><span className="material-symbols-outlined loading-spin">hourglass_top</span>Đang xử lý...</>
                            ) : (
                                <><span className="material-symbols-outlined">search</span>Kiểm tra xe ra</>
                            )}
                        </button>
                    </form>

                    {/* ── Kết quả sau khi kiểm tra ── */}
                    {preCheckResult ? (
                        <div className="epp-result-stack">

                            {/* Warning (nếu có) */}
                            {preCheckResult.warning && (
                                <div className="epp-warning-box">
                                    <AlertTriangle size={13} color="#d97706" />
                                    <span className="epp-warning-text">{preCheckResult.warning}</span>
                                </div>
                            )}

                            {/* Thẻ tháng info card */}
                            {(isMonthly || isMonthlyValid) && (
                                <div className="epp-card" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                                    <div className="epp-card-header">
                                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#16a34a" }}>verified</span>
                                        <span className="epp-card-title" style={{ color: "#166534", flex: 1 }}>Thẻ tháng</span>
                                        <span className="epp-badge" style={{ background: isMonthlyValid ? "#dcfce7" : "#fee2e2", color: isMonthlyValid ? "#16a34a" : "#dc2626", border: `1px solid ${isMonthlyValid ? "#bbf7d0" : "#fecaca"}` }}>
                                            {isMonthlyValid ? "Hợp lệ" : "Hết hạn"}
                                        </span>
                                    </div>
                                    <div className="epp-info-grid">
                                        <div className="epp-info-item">
                                            <span className="epp-info-label">Biển số:</span>
                                            <span className="epp-info-value">{preCheckResult.vehicle?.plate_number || preCheckResult.session?.plate_number || plateNumber}</span>
                                        </div>
                                        <div className="epp-info-item">
                                            <span className="epp-info-label">Chủ xe:</span>
                                            <span className="epp-info-value">{getOwnerName()}</span>
                                        </div>
                                        <div className="epp-info-item">
                                            <span className="epp-info-label">Mã thẻ:</span>
                                            <span className="epp-info-value">{preCheckResult.card?.code || preCheckResult.card?.card_code || "---"}</span>
                                        </div>
                                        <div className="epp-info-item">
                                            <span className="epp-info-label">Loại xe:</span>
                                            <span className="epp-info-value">{preCheckResult.vehicle?.vehicle_type?.name || "---"}</span>
                                        </div>
                                        <div className="epp-info-item" style={{ gridColumn: "span 2" }}>
                                            <span className="epp-info-label">Hạn dùng:</span>
                                            <span className="epp-info-value" style={{ color: isMonthlyValid ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                                                {vehiclePackage?.end_date ? new Date(vehiclePackage.end_date).toLocaleDateString("vi-VN") : "---"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Phiên hoạt động card */}
                            <div className="epp-card">
                                <div className="epp-card-header">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#2563eb" }}>schedule</span>
                                    <span className="epp-card-title" style={{ color: "#1e3a8a", flex: 1 }}>Thông tin phiên</span>
                                    <span className="epp-badge" style={{
                                        background: (isMonthly || isMonthlyValid) ? "#f0fdf4" : "#eff6ff",
                                        color: (isMonthly || isMonthlyValid) ? "#16a34a" : "#2563eb",
                                        border: `1px solid ${(isMonthly || isMonthlyValid) ? "#bbf7d0" : "#bfdbfe"}`
                                    }}>
                                        {preCheckResult.ticket_type || "Vé lượt"}
                                    </span>
                                </div>

                                <div className="epp-info-grid">
                                    <div className="epp-info-item">
                                        <span className="epp-info-label">Mã thẻ:</span>
                                        <span className="epp-info-value" style={{ color: "#2563eb", fontWeight: 700 }}>
                                            {preCheckResult.card?.code || preCheckResult.card?.card_code || preCheckResult.cardCode || "---"}
                                        </span>
                                    </div>
                                    <div className="epp-info-item">
                                        <span className="epp-info-label">Biển số:</span>
                                        <span className="epp-info-value">
                                            {preCheckResult.vehicle?.plate_number || preCheckResult.session?.plate_number || plateNumber}
                                        </span>
                                    </div>
                                    {preCheckResult.session?.entry_time && (
                                        <div className="epp-info-item">
                                            <span className="epp-info-label">Giờ vào:</span>
                                            <span className="epp-info-value">{new Date(preCheckResult.session.entry_time).toLocaleString("vi-VN")}</span>
                                        </div>
                                    )}
                                    <div className="epp-info-item">
                                        <span className="epp-info-label">Hiện tại:</span>
                                        <span className="epp-info-value">{new Date().toLocaleString("vi-VN")}</span>
                                    </div>
                                    {(preCheckResult.session?.entry_time || preCheckResult.fee_breakdown?.hours) && (
                                        <div className="epp-info-item" style={{ gridColumn: "span 2" }}>
                                            <span className="epp-info-label">Thời gian gửi:</span>
                                            <span className="epp-info-value">
                                                {formatDurationText(preCheckResult.fee_breakdown?.hours, preCheckResult.session?.entry_time)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Phí */}
                                <div className="epp-fee-row">
                                    <span className="epp-fee-label">Phí ước tính:</span>
                                    <span className="epp-fee-amt" style={{ color: preCheckResult.estimated_fee === 0 ? "#16a34a" : "#dc2626" }}>
                                        {formatVND(preCheckResult.estimated_fee)}
                                    </span>
                                </div>

                                {/* Chi tiết công thức: Ngày × giá trần + Giờ lẻ */}
                                {preCheckResult.ticket_type === "Thẻ lượt" && preCheckResult.fee_breakdown && preCheckResult.estimated_fee > 0 && (() => {
                                    const bd = preCheckResult.fee_breakdown;
                                    const hasDays = (bd.fullDays ?? 0) > 0;
                                    const hasRemainder = (bd.remainingFee ?? 0) > 0;
                                    if (!hasDays && !hasRemainder) return null;
                                    return (
                                        <div style={{
                                            background: "#f8fafc", border: "1px dashed #cbd5e1",
                                            borderRadius: 6, padding: "4px 8px", fontSize: 11,
                                            color: "#475569", lineHeight: 1.6
                                        }}>
                                            <div style={{ fontWeight: 700, color: "#334155", marginBottom: 2 }}>Chi tiết tính phí:</div>
                                            {hasDays && (
                                                <div>
                                                    {bd.fullDays} ngày × {formatVND(bd.dailyCeilingPrice)}
                                                    <span style={{ color: "#94a3b8" }}> (giá trần/ngày)</span>
                                                    {" = "}<strong>{formatVND(bd.fullDays * bd.dailyCeilingPrice)}</strong>
                                                </div>
                                            )}
                                            {hasRemainder && (
                                                <div>
                                                    {bd.remainingHours != null ? `${bd.remainingHours.toFixed(2)}h lẻ` : "Giờ lẻ"}
                                                    {" = "}<strong>{formatVND(bd.remainingFee)}</strong>
                                                </div>
                                            )}
                                            {hasDays && hasRemainder && (
                                                <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 2, paddingTop: 2, fontWeight: 700, color: "#dc2626" }}>
                                                    Tổng = {formatVND(preCheckResult.estimated_fee)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Action buttons */}
                                <div className="epp-actions">
                                    {preCheckResult.ticket_type === "Mất thẻ" ? (
                                        (lostCardReport && ((lostCardReport.pendingPayment && lostCardReport.pendingPayment.paymentMethod === 'cash') || lostCardReport.status === 'Đã xong' || lostCardReport.status === 'Hoàn thành' || lostCardReport._backendStatus === 'Đã xong')) ? (
                                            <>
                                                <div style={{
                                                    background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
                                                    padding: "8px 10px", fontSize: 12, color: "#166534", marginBottom: 4
                                                }}>
                                                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#16a34a" }}>check_circle</span>
                                                        ĐÃ GHI NHẬN THANH TOÁN BÁO MẤT THẺ
                                                    </div>
                                                    <div style={{ marginTop: 4, color: "#15803d" }}>
                                                        Mã báo mất: <strong>{lostCardReport.display_report_id || lostCardReport.id || '---'}</strong>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={handleConfirmLostCardExit} disabled={isDisableActions} className="epp-btn-primary epp-btn-primary--free">
                                                    <LogOut size={13} /><span>Mở barie / Cho xe ra</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{
                                                    background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
                                                    padding: "8px 10px", fontSize: 12, color: "#b45309", marginBottom: 4
                                                }}>
                                                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#d97706" }}>warning</span>
                                                        XE BÁO MẤT CHƯA THỰC HIỆN THANH TOÁN
                                                    </div>
                                                    <div style={{ marginTop: 2, color: "#92400e" }}>
                                                        Vui lòng khởi tạo thanh toán tại màn hình <strong>Nhật ký báo mất thẻ</strong> trước khi cho xe ra bãi.
                                                    </div>
                                                </div>
                                                <button type="button" disabled className="epp-btn-primary" style={{ background: "#94a3b8", cursor: "not-allowed" }}>
                                                    <LogOut size={13} /><span>Chưa thanh toán — Không thể xuất bến</span>
                                                </button>
                                            </>
                                        )
                                    ) : preCheckResult.estimated_fee === 0 ? (
                                        <button type="button" onClick={handleOpenGateFree} disabled={isDisableActions} className="epp-btn-primary epp-btn-primary--free">
                                            <LogOut size={13} /><span>Mở barie / Cho xe ra</span>
                                        </button>
                                    ) : (
                                        <>
                                            <button type="button" onClick={handlePayCash} disabled={isDisableActions} className="epp-btn-primary epp-btn-primary--cash">
                                                <Wallet size={13} /><span>Thanh toán tiền mặt</span>
                                            </button>
                                            <button type="button" onClick={handlePayVNPay} disabled={isDisableActions} className="epp-btn-primary epp-btn-primary--vnpay">
                                                <CreditCard size={13} /><span>Thanh toán VNPay</span>
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="epp-btn-cancel epp-btn-cancel--reset"
                                    >
                                        Hủy giao dịch
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="epp-empty-card">
                            <Clock size={20} color="#94a3b8" />
                            <p className="epp-empty-text">Chưa có thông tin phiên đỗ xe.</p>
                            <p className="epp-empty-subtext">Nhập biển số và bấm Kiểm tra.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
