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
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#fef2f2', border: '2px solid #fca5a5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
            }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#ef4444' }}>
                    event_busy
                </span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                Vé tháng đã hết hạn
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
                Thẻ <strong>{cardCode}</strong> đã quá ngày hiệu lực. Không thể gia hạn nối tiếp.
                <br />
                Vui lòng sử dụng chức năng <strong>"Đăng ký vé tháng"</strong> để đăng ký kỳ mới.
            </p>
            <div style={{
                background: '#fff7ed', border: '1px solid #fed7aa',
                borderRadius: 8, padding: '12px 16px',
                fontSize: '0.85rem', color: '#92400e', marginBottom: 24, textAlign: 'left'
            }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>
                    info
                </span>
                Ngày hiệu lực của vé mới sẽ tính từ ngày đăng ký mới, không cộng nối vào ngày hết hạn cũ.
            </div>
            <button
                onClick={onClose}
                style={{
                    padding: '10px 32px', borderRadius: 8,
                    background: '#f1f5f9', border: '1px solid #cbd5e1',
                    color: '#475569', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500
                }}
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
            <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 10, padding: 16, marginBottom: 20
            }}>
                <p style={{ fontWeight: 600, color: '#b45309', fontSize: '0.9rem', marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>
                        payment
                    </span>
                    Đang chờ thanh toán qua VNPay
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Mã giao dịch</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{orderCode}</span>
                    <span style={{ color: '#64748b' }}>Số tiền</span>
                    <span style={{ fontWeight: 700, color: '#b45309' }}>{formatCurrency(amount)}</span>
                    <span style={{ color: '#64748b' }}>Hạn hiện tại</span>
                    <span style={{ color: '#1e293b' }}>{formatDate(currentExpiry)}</span>
                    <span style={{ color: '#64748b' }}>Hạn mới sau gia hạn</span>
                    <span style={{ fontWeight: 600, color: '#0284c7' }}>{formatDate(newExpiry)}</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    onClick={onClose}
                    style={{
                        flex: 1, padding: '10px', borderRadius: 8,
                        background: '#f8fafc', border: '1px solid #cbd5e1',
                        color: '#64748b', cursor: 'pointer', fontWeight: 500
                    }}
                >
                    Để sau
                </button>
                <button
                    onClick={handleGoToPay}
                    disabled={!payUrl}
                    style={{
                        flex: 2, padding: '10px', borderRadius: 8,
                        background: !payUrl ? '#cbd5e1' : '#f97316',
                        color: '#fff', border: 'none', cursor: !payUrl ? 'default' : 'pointer',
                        fontWeight: 600, fontSize: '0.95rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
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
            <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 10, padding: 16, marginBottom: 20
            }}>
                <p style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem', marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>
                        payments
                    </span>
                    Đang chờ xác nhận thu tiền mặt
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Mã giao dịch</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{orderCode}</span>
                    <span style={{ color: '#64748b' }}>Số tiền</span>
                    <span style={{ fontWeight: 700, color: '#166534' }}>{formatCurrency(amount)}</span>
                    <span style={{ color: '#64748b' }}>Hạn hiện tại</span>
                    <span style={{ color: '#1e293b' }}>{formatDate(currentExpiry)}</span>
                    <span style={{ color: '#64748b' }}>Hạn mới sau gia hạn</span>
                    <span style={{ fontWeight: 600, color: '#0284c7' }}>{formatDate(newExpiry)}</span>
                </div>
            </div>

            {confirmError && (
                <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: 8, padding: 12, marginBottom: 16, color: '#991b1b', fontSize: '0.875rem'
                }}>
                    {confirmError}
                </div>
            )}

            {confirmSuccess ? (
                <div style={{
                    background: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: 8, padding: '16px', textAlign: 'center', color: '#166534', fontSize: '0.95rem', fontWeight: 600
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>check_circle</span>
                    Gia hạn thành công! Thẻ {cardCode} đã được gia hạn đến {formatDate(newExpiry)}.
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onClose}
                        disabled={isConfirming}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 8,
                            background: '#f8fafc', border: '1px solid #cbd5e1',
                            color: '#64748b', cursor: 'pointer', fontWeight: 500
                        }}
                    >
                        Để sau
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        style={{
                            flex: 2, padding: '10px', borderRadius: 8,
                            background: isConfirming ? '#86efac' : '#16a34a',
                            color: '#fff', border: 'none', cursor: isConfirming ? 'default' : 'pointer',
                            fontWeight: 600, fontSize: '0.95rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                    >
                        {isConfirming ? (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>autorenew</span>
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
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
            if (onSuccess) setTimeout(onSuccess, 1800);
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
            <div className="renew-modal" style={{ maxWidth: 520 }}>
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
                <div style={{ padding: step === 'loading' ? '24px 0' : 0 }}>
                    {/* Loading */}
                    {step === 'loading' && (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '32px 0' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 40, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }}>
                                autorenew
                            </span>
                            Đang tải thông tin gia hạn...
                        </div>
                    )}

                    {/* Error */}
                    {step === 'error' && (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <p style={{ color: '#ef4444', marginBottom: 16 }}>{loadError}</p>
                            <button onClick={loadRenewalInfo} style={{ padding: '8px 20px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
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
                                    <span className="renew-info-value" style={{ fontWeight: 700, color: daysLeft !== null && daysLeft <= 7 ? '#f59e0b' : '#1e293b' }}>
                                        {formatDate(renewalInfo.currentExpiry)}
                                        {daysLeft !== null && (
                                            <span style={{ fontSize: '0.8rem', color: daysLeft <= 7 ? '#f59e0b' : '#64748b', marginLeft: 6 }}>
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
                                    <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>
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
                                    <div style={{
                                        background: '#f0fdf4', border: '1px solid #86efac',
                                        borderRadius: 8, padding: '10px 14px',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#16a34a' }}>event_available</span>
                                        <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                                            {formatDate(renewalInfo.currentExpiry)}
                                        </span>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748b' }}>arrow_forward</span>
                                        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.95rem' }}>
                                            {formatDate(previewNewExpiry)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Phương thức thanh toán */}
                            <div className="renew-form-group">
                                <label>Phương thức thanh toán</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {/* VNPay */}
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: `2px solid ${paymentMethod === 'vnpay' ? '#2563eb' : '#e2e8f0'}`,
                                        background: paymentMethod === 'vnpay' ? '#eff6ff' : '#f8fafc',
                                        transition: 'all 0.15s'
                                    }}>
                                        <input
                                            type="radio"
                                            name="payMethod"
                                            value="vnpay"
                                            checked={paymentMethod === 'vnpay'}
                                            onChange={() => setPaymentMethod('vnpay')}
                                            style={{ accentColor: '#2563eb' }}
                                        />
                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>credit_card</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>VNPay</span>
                                    </label>
                                    {/* Tiền mặt */}
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: `2px solid ${paymentMethod === 'cash' ? '#16a34a' : '#e2e8f0'}`,
                                        background: paymentMethod === 'cash' ? '#f0fdf4' : '#f8fafc',
                                        transition: 'all 0.15s'
                                    }}>
                                        <input
                                            type="radio"
                                            name="payMethod"
                                            value="cash"
                                            checked={paymentMethod === 'cash'}
                                            onChange={() => setPaymentMethod('cash')}
                                            style={{ accentColor: '#16a34a' }}
                                        />
                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#16a34a' }}>payments</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>Tiền mặt</span>
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
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fca5a5',
                                    borderRadius: 8, padding: 12, marginBottom: 16,
                                    color: '#991b1b', fontSize: '0.875rem'
                                }}>
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

            {/* CSS animation cho spinner */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}