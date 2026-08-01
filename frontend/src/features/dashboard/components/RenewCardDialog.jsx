/**
 * RenewCardDialog.jsx
 * Dialog gia hạn vé tháng — hỗ trợ VNPay và tiền mặt.
 *
 * Luồng:
 *  - Bước 1 (Load): Gọi getRenewalInfo → kiểm tra thẻ còn hạn không
 *    • Còn hạn  → hiển thị wizard chọn gói + phương thức
 *    • Hết hạn  → hiển thị thông báo "Không thể gia hạn", hướng dẫn dùng "Đăng ký vé tháng mới"
 *  - Bước 2 (Chọn gói + phương thức): Dropdown gói + radio VNPay/Tiền mặt
 *  - Bước 3 (Xác nhận): Preview thời hạn mới, tổng tiền
 *    • VNPay → redirect sang cổng thanh toán
 *    • Tiền mặt → hiển thị panel chờ + nút "Xác nhận thu tiền" cho cashier
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getRenewalInfo, initiateRenewal, confirmRenewalCash } from '../../../service/monthCardApi';

// ─── Helpers ──────────────────────────────────────────────────
// Delay (ms) trước khi đóng dialog sau khi gia hạn thành công
const SUCCESS_CLOSE_DELAY_MS = 1800;

const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('vi-VN');
};

// Tính số ngày còn lại đến ngày hết hạn
const getDaysLeft = (expiryStr) => {
    if (!expiryStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryStr);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

// ─── Sub-component: Expired warning ───────────────────────────
function ExpiredWarning({ cardCode, onClose }) {
    return (
        <div className="rcd-expired-container">
            <div className="rcd-expired-icon-box">
                <span className="material-symbols-outlined">
                    event_busy
                </span>
            </div>
            <h3 className="rcd-expired-title">
                Vé tháng đã hết hạn
            </h3>
            <p className="rcd-expired-desc">
                Thẻ <strong>{cardCode}</strong> đã quá ngày hiệu lực. Không thể gia hạn nối tiếp.
                <br />
                Vui lòng sử dụng chức năng <strong>"Đăng ký vé tháng"</strong> để đăng ký kỳ mới.
            </p>
            <div className="rcd-expired-note">
                <span className="material-symbols-outlined">
                    info
                </span>
                Ngày hiệu lực của vé mới sẽ tính từ ngày đăng ký mới, không cộng nối vào ngày hết hạn cũ.
            </div>
            <button
                type="button"
                onClick={onClose}
                className="rcd-btn-close"
            >
                Đóng
            </button>
        </div>
    );
}

// ─── Sub-component: VNPay pending panel ────────────────────────
function VNPayPendingPanel({ orderCode, amount, currentExpiry, newExpiry, cardCode, payUrl, onClose }) {
    const handleGoToPay = () => {
        if (payUrl) {
            window.location.href = payUrl;
        }
    };

    return (
        <div>
            <div className="rcd-pending-card rcd-pending-card--vnpay">
                <p className="rcd-pending-title rcd-pending-title--vnpay">
                    <span className="material-symbols-outlined">
                        payment
                    </span>
                    Đang chờ thanh toán qua VNPay
                </p>
                <div className="rcd-pending-grid">
                    <span className="rcd-pending-label">Mã giao dịch</span>
                    <span className="rcd-pending-val rcd-pending-val--bold">{orderCode}</span>
                    <span className="rcd-pending-label">Số tiền</span>
                    <span className="rcd-pending-val rcd-pending-val--vnpay">{formatCurrency(amount)}</span>
                    <span className="rcd-pending-label">Hạn hiện tại</span>
                    <span className="rcd-pending-val">{formatDate(currentExpiry)}</span>
                    <span className="rcd-pending-label">Hạn mới sau gia hạn</span>
                    <span className="rcd-pending-val rcd-pending-val--new">{formatDate(newExpiry)}</span>
                </div>
            </div>

            <div className="rcd-pending-actions">
                <button
                    type="button"
                    onClick={onClose}
                    className="rcd-btn-defer"
                >
                    Để sau
                </button>
                <button
                    type="button"
                    onClick={handleGoToPay}
                    disabled={!payUrl}
                    className="rcd-btn-continue"
                >
                    <span className="material-symbols-outlined">open_in_new</span>
                    Tiếp tục thanh toán VNPay
                </button>
            </div>
        </div>
    );
}

// ─── Sub-component: Cash pending panel ────────────────────────
function CashPendingPanel({ orderCode, amount, currentExpiry, newExpiry, cardCode, onConfirm, onClose, isConfirming, confirmError, confirmSuccess }) {
    return (
        <div>
            <div className="rcd-pending-card rcd-pending-card--cash">
                <p className="rcd-pending-title rcd-pending-title--cash">
                    <span className="material-symbols-outlined">
                        payments
                    </span>
                    Đang chờ xác nhận thu tiền mặt
                </p>
                <div className="rcd-pending-grid">
                    <span className="rcd-pending-label">Mã giao dịch</span>
                    <span className="rcd-pending-val rcd-pending-val--bold">{orderCode}</span>
                    <span className="rcd-pending-label">Số tiền</span>
                    <span className="rcd-pending-val rcd-pending-val--cash">{formatCurrency(amount)}</span>
                    <span className="rcd-pending-label">Hạn hiện tại</span>
                    <span className="rcd-pending-val">{formatDate(currentExpiry)}</span>
                    <span className="rcd-pending-label">Hạn mới sau gia hạn</span>
                    <span className="rcd-pending-val rcd-pending-val--new">{formatDate(newExpiry)}</span>
                </div>
            </div>

            {confirmError && (
                <div className="rcd-error-box">
                    {confirmError}
                </div>
            )}

            {confirmSuccess ? (
                <div className="rcd-success-box">
                    <span className="material-symbols-outlined rcd-success-icon">check_circle</span>
                    Gia hạn thành công! Thẻ {cardCode} đã được gia hạn đến {formatDate(newExpiry)}.
                </div>
            ) : (
                <div className="rcd-pending-actions">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isConfirming}
                        className="rcd-btn-defer"
                    >
                        Để sau
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="rcd-btn-confirm-cash"
                    >
                        {isConfirming ? (
                            <>
                                <span className="material-symbols-outlined rcd-loading-icon">autorenew</span>
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">check</span>
                                Xác nhận đã thu {formatCurrency(amount)}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────
export default function RenewCardDialog({ isOpen, onClose, cardData, onSuccess }) {
    // State
    const [step, setStep] = useState('loading'); // loading | expired | select | confirm | cash-pending
    const [renewalInfo, setRenewalInfo] = useState(null);
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('vnpay');
    const [loadError, setLoadError] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cash pending state
    const [pendingOrderCode, setPendingOrderCode] = useState(null);
    const [pendingAmount, setPendingAmount] = useState(0);
    const [pendingNewExpiry, setPendingNewExpiry] = useState(null);
    const [pendingPayUrl, setPendingPayUrl] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmError, setConfirmError] = useState(null);
    const [confirmSuccess, setConfirmSuccess] = useState(false);

    // Load renewal info khi mở dialog
    const loadRenewalInfo = useCallback(async () => {
        if (!cardData?.card_id) {
            setLoadError('Không tìm thấy thông tin thẻ.');
            setStep('error');
            return;
        }
        setStep('loading');
        setLoadError(null);
        try {
            const info = await getRenewalInfo(cardData.card_id);
            setRenewalInfo(info);

            if (info.isExpired) {
                setStep('expired');
            } else if (info.pendingPayment) {
                // Nếu đang có đơn chờ thanh toán (tiền mặt hoặc VNPay) -> Khôi phục
                setPendingOrderCode(info.pendingPayment.orderCode);
                setPendingAmount(info.pendingPayment.amount);
                setPendingPayUrl(info.pendingPayment.payUrl);

                // Trích xuất ngày hết hạn mới từ note của payment
                let newExpiry = null;
                try {
                    const noteObj = JSON.parse(info.pendingPayment.note);
                    newExpiry = noteObj.newExpiry;
                } catch (e) {
                    console.error("Lỗi parse note:", e);
                }
                setPendingNewExpiry(newExpiry);

                // Đồng bộ phương thức thanh toán và chuyển bước tương ứng
                setPaymentMethod(info.pendingPayment.paymentMethod);
                if (info.pendingPayment.paymentMethod === 'cash') {
                    setStep('cash-pending');
                } else {
                    setStep('vnpay-pending');
                }
            } else {
                // Auto-chọn gói đầu tiên
                if (info.availablePackages?.length > 0) {
                    setSelectedPackageId(info.availablePackages[0].package_id);
                }
                setStep('select');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Không thể tải thông tin gia hạn.';
            // Nếu lỗi là "hết hạn" thì show màn hình expired thay vì lỗi chung
            if (msg.includes('hết hạn') || msg.includes('đã hết hạn')) {
                setRenewalInfo({ cardCode: cardData.cardNo, isExpired: true });
                setStep('expired');
            } else {
                setLoadError(msg);
                setStep('error');
            }
        }
    }, [cardData]);

    useEffect(() => {
        if (isOpen) {
            // Reset state
            setSelectedPackageId('');
            setPaymentMethod('vnpay');
            setSubmitError(null);
            setPendingOrderCode(null);
            setPendingPayUrl(null);
            setConfirmError(null);
            setConfirmSuccess(false);
            loadRenewalInfo();
        }
    }, [isOpen, loadRenewalInfo]);

    if (!isOpen || !cardData) return null;

    // Gói được chọn
    const selectedPkg = renewalInfo?.availablePackages?.find(p => p.package_id === selectedPackageId);
    const daysLeft = renewalInfo ? getDaysLeft(renewalInfo.currentExpiry) : null;

    // Tính preview ngày hết hạn mới từ server data
    const previewNewExpiry = (() => {
        if (!renewalInfo?.currentExpiry || !selectedPkg) return null;
        const expiry = new Date(renewalInfo.currentExpiry);
        const day = expiry.getDate();
        expiry.setDate(expiry.getDate() + 1); // start = expiry + 1
        expiry.setMonth(expiry.getMonth() + Number(selectedPkg.duration_month));
        if (expiry.getDate() !== day + 1 && expiry.getDate() !== 1) expiry.setDate(0);
        return expiry.toISOString().split('T')[0];
    })();

    // Submit: khởi tạo giao dịch
    const handleSubmit = async () => {
        if (!selectedPackageId) {
            setSubmitError('Vui lòng chọn gói gia hạn.');
            return;
        }
        setSubmitError(null);
        setIsSubmitting(true);

        try {
            const result = await initiateRenewal({
                cardId: cardData.card_id,
                packageId: selectedPackageId,
                paymentMethod,
            });

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('monthCardLogsUpdated'));
            }

            if (paymentMethod === 'vnpay') {
                if (result.payUrl) {
                    window.location.href = result.payUrl;
                } else {
                    throw new Error('Không tạo được đường dẫn thanh toán VNPay.');
                }
            } else {
                // Tiền mặt → chuyển sang màn hình chờ xác nhận
                setPendingOrderCode(result.orderCode);
                setPendingAmount(result.amount);
                setPendingNewExpiry(result.newExpiry);
                setStep('cash-pending');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Đã xảy ra lỗi.';
            setSubmitError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xác nhận thu tiền mặt
    const handleConfirmCash = async () => {
        setIsConfirming(true);
        setConfirmError(null);
        try {
            await confirmRenewalCash(pendingOrderCode);
            setConfirmSuccess(true);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('monthCardLogsUpdated'));
            }
            if (onSuccess) setTimeout(onSuccess, SUCCESS_CLOSE_DELAY_MS);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi xác nhận tiền mặt.';
            setConfirmError(msg);
        } finally {
            setIsConfirming(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────
    return (
        <div className="renew-modal-overlay">
            <div className="renew-modal rcd-modal-maxWidth">
                {/* Header */}
                <div className="renew-modal-header">
                    <h2>
                        {step === 'cash-pending'
                            ? 'Xác nhận thu tiền mặt'
                            : step === 'vnpay-pending'
                                ? 'Thanh toán VNPay đang chờ'
                                : 'Gia hạn Vé tháng'
                        }
                    </h2>
                    <button
                        type="button"
                        className="renew-modal-close"
                        onClick={onClose}
                        disabled={isSubmitting || isConfirming}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className={step === 'loading' ? 'rcd-body-padding' : ''}>
                    {/* Loading */}
                    {step === 'loading' && (
                        <div className="rcd-loading-box">
                            <span className="material-symbols-outlined rcd-loading-icon">
                                autorenew
                            </span>
                            Đang tải thông tin gia hạn...
                        </div>
                    )}

                    {/* Error */}
                    {step === 'error' && (
                        <div className="rcd-error-center">
                            <p className="rcd-error-msg">{loadError}</p>
                            <button type="button" onClick={loadRenewalInfo} className="rcd-btn-retry">
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Expired */}
                    {step === 'expired' && renewalInfo && (
                        <ExpiredWarning
                            cardCode={renewalInfo.cardCode || cardData.cardNo}
                            onClose={onClose}
                        />
                    )}

                    {/* Cash pending */}
                    {step === 'cash-pending' && (
                        <CashPendingPanel
                            orderCode={pendingOrderCode}
                            amount={pendingAmount}
                            currentExpiry={renewalInfo?.currentExpiry}
                            newExpiry={pendingNewExpiry}
                            cardCode={renewalInfo?.cardCode || cardData.cardNo}
                            onConfirm={handleConfirmCash}
                            onClose={onClose}
                            isConfirming={isConfirming}
                            confirmError={confirmError}
                            confirmSuccess={confirmSuccess}
                        />
                    )}

                    {/* VNPay pending */}
                    {step === 'vnpay-pending' && (
                        <VNPayPendingPanel
                            orderCode={pendingOrderCode}
                            amount={pendingAmount}
                            currentExpiry={renewalInfo?.currentExpiry}
                            newExpiry={pendingNewExpiry}
                            cardCode={renewalInfo?.cardCode || cardData.cardNo}
                            payUrl={pendingPayUrl}
                            onClose={onClose}
                        />
                    )}

                    {/* Select step */}
                    {step === 'select' && renewalInfo && (
                        <div>
                            {/* Thông tin thẻ */}
                            <div className="renew-info-grid">
                                <div className="renew-info-item">
                                    <span className="renew-info-label">Số thẻ</span>
                                    <span className="renew-info-value">{renewalInfo.cardCode}</span>
                                </div>
                                <div className="renew-info-item">
                                    <span className="renew-info-label">Biển số xe</span>
                                    <span className="renew-info-value">{renewalInfo.vehicle?.plate || cardData.plate || '---'}</span>
                                </div>
                                <div className="renew-info-item">
                                    <span className="renew-info-label">Chủ thẻ</span>
                                    <span className="renew-info-value">{renewalInfo.vehicle?.customerName || cardData.customer || '---'}</span>
                                </div>
                                <div className="renew-info-item">
                                    <span className="renew-info-label">Hạn dùng hiện tại</span>
                                    <span className={`renew-info-value ${daysLeft !== null && daysLeft <= 7 ? 'rcd-days-left--urgent' : ''}`}>
                                        {formatDate(renewalInfo.currentExpiry)}
                                        {daysLeft !== null && (
                                            <span className={`rcd-days-left ${daysLeft <= 7 ? 'rcd-days-left--urgent' : 'rcd-days-left--normal'}`}>
                                                (còn {daysLeft} ngày)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Chọn gói */}
                            <div className="renew-form-group">
                                <label htmlFor="pkg-select">Gói gia hạn</label>
                                {renewalInfo.availablePackages?.length === 0 ? (
                                    <p className="rcd-no-pkg">
                                        Không có gói nào khả dụng cho loại xe này.
                                    </p>
                                ) : (
                                    <select
                                        id="pkg-select"
                                        className="renew-select"
                                        value={selectedPackageId}
                                        onChange={(e) => setSelectedPackageId(e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        {renewalInfo.availablePackages?.map(pkg => (
                                            <option key={pkg.package_id} value={pkg.package_id}>
                                                {pkg.name || `${pkg.duration_month} tháng`} — {formatCurrency(pkg.price)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Preview ngày hết hạn mới */}
                            {selectedPkg && previewNewExpiry && (
                                <div className="renew-form-group">
                                    <label>Ngày hết hạn mới (dự kiến)</label>
                                    <div className="rcd-preview-box">
                                        <span className="material-symbols-outlined rcd-preview-icon">event_available</span>
                                        <span className="rcd-preview-old">
                                            {formatDate(renewalInfo.currentExpiry)}
                                        </span>
                                        <span className="material-symbols-outlined rcd-preview-arrow">arrow_forward</span>
                                        <span className="rcd-preview-new">
                                            {formatDate(previewNewExpiry)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Phương thức thanh toán */}
                            <div className="renew-form-group">
                                <label>Phương thức thanh toán</label>
                                <div className="rcd-pay-options">
                                    {/* VNPay */}
                                    <label className={`rcd-pay-option ${paymentMethod === 'vnpay' ? 'rcd-pay-option--vnpay' : 'rcd-pay-option--inactive'}`}>
                                        <input
                                            type="radio"
                                            name="payMethod"
                                            value="vnpay"
                                            checked={paymentMethod === 'vnpay'}
                                            onChange={() => setPaymentMethod('vnpay')}
                                            style={{ accentColor: '#2563eb' }}
                                        />
                                        <span className="material-symbols-outlined rcd-pay-option-icon--vnpay">credit_card</span>
                                        <span className="rcd-pay-option-text">VNPay</span>
                                    </label>
                                    {/* Tiền mặt */}
                                    <label className={`rcd-pay-option ${paymentMethod === 'cash' ? 'rcd-pay-option--cash' : 'rcd-pay-option--inactive'}`}>
                                        <input
                                            type="radio"
                                            name="payMethod"
                                            value="cash"
                                            checked={paymentMethod === 'cash'}
                                            onChange={() => setPaymentMethod('cash')}
                                            style={{ accentColor: '#16a34a' }}
                                        />
                                        <span className="material-symbols-outlined rcd-pay-option-icon--cash">payments</span>
                                        <span className="rcd-pay-option-text">Tiền mặt</span>
                                    </label>
                                </div>
                            </div>

                            {/* Tổng tiền */}
                            <div className="renew-price-box">
                                <span className="renew-price-title">Tổng chi phí</span>
                                <span className="renew-price-value">{formatCurrency(selectedPkg?.price || 0)}</span>
                            </div>

                            {/* Error */}
                            {submitError && (
                                <div className="rcd-error-box">
                                    {submitError}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="renew-modal-actions">
                                <button
                                    type="button"
                                    className="renew-btn secondary"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    className="renew-btn primary"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !selectedPackageId || renewalInfo.availablePackages?.length === 0}
                                >
                                    {isSubmitting
                                        ? 'Đang xử lý...'
                                        : paymentMethod === 'vnpay'
                                            ? 'Thanh toán qua VNPay'
                                            : 'Xác nhận gia hạn tiền mặt'
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}