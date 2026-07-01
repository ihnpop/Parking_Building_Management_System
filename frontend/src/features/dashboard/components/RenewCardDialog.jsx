import React, { useState, useEffect } from 'react';
import { getRenewPackages, renewMonthCard } from '../../../service/monthCardApi';
import { createPackagePayment } from '../../../service/paymentApi';

export default function RenewCardDialog({ isOpen, onClose, cardData, onSuccess }) {
    const [packages, setPackages] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState('');
    const [note, setNote] = useState('');
    const [loadingPackages, setLoadingPackages] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset state
            setSelectedMonths('');
            setNote('');
            setError(null);
            setSuccessMessage('');
            
            // Fetch packages
            const fetchPackages = async () => {
                try {
                    setLoadingPackages(true);
                    const pkgs = await getRenewPackages();
                    setPackages(pkgs);
                    if (pkgs && pkgs.length > 0) {
                        setSelectedMonths(pkgs[0].months.toString());
                    }
                } catch (err) {
                    console.error("Lỗi lấy danh sách gói cước:", err);
                    setError("Không thể tải danh sách gói cước gia hạn.");
                } finally {
                    setLoadingPackages(false);
                }
            };
            fetchPackages();
        }
    }, [isOpen]);

    if (!isOpen || !cardData) return null;

    const selectedPkg = packages.find(p => p.months.toString() === selectedMonths);
    const price = selectedPkg ? selectedPkg.price : 0;

    // Date computation helper
    const addMonthsSafely = (date, months) => {
        const d = new Date(date);
        const day = d.getDate();
        d.setMonth(d.getMonth() + months);
        if (d.getDate() !== day) {
            d.setDate(0);
        }
        return d;
    };

    const calculateNewExpiryDate = () => {
        if (!selectedMonths) return null;
        const months = parseInt(selectedMonths, 10);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = today;
        if (cardData.expiredDate) {
            const currentExpiry = new Date(cardData.expiredDate);
            currentExpiry.setHours(0, 0, 0, 0);
            if (currentExpiry > today) {
                startDate = currentExpiry;
            }
        }
        return addMonthsSafely(startDate, months);
    };

    const newExpiryDate = calculateNewExpiryDate();
    const formattedNewExpiry = newExpiryDate ? newExpiryDate.toLocaleDateString('vi-VN') : '---';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMonths) {
            setError("Vui lòng chọn gói gia hạn.");
            return;
        }

        setError(null);
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            const response = await createPackagePayment(cardData.registrationId, price, true);
            if (response.data?.payUrl) {
                setSuccessMessage("Đang chuyển hướng sang cổng thanh toán VNPAY...");
                setTimeout(() => {
                    window.location.href = response.data.payUrl;
                }, 1000);
            } else {
                throw new Error("Không khởi tạo được đường dẫn thanh toán");
            }
        } catch (err) {
            console.error("Lỗi khởi tạo thanh toán VNPAY:", err);
            const msg = err.response?.data?.message || err.message || "Đã xảy ra lỗi trong quá trình khởi tạo thanh toán.";
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    return (
        <div className="renew-modal-overlay">
            <div className="renew-modal">
                <div className="renew-modal-header">
                    <h2>Gia hạn Thẻ tháng</h2>
                    <button type="button" className="renew-modal-close" onClick={onClose} disabled={isSubmitting}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div style={{ color: '#10b981', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {successMessage}
                        </div>
                    )}

                    <div className="renew-info-grid">
                        <div className="renew-info-item">
                            <span className="renew-info-label">Số thẻ</span>
                            <span className="renew-info-value">{cardData.cardNo}</span>
                        </div>
                        <div className="renew-info-item">
                            <span className="renew-info-label">Biển số xe</span>
                            <span className="renew-info-value">{cardData.plate}</span>
                        </div>
                        <div className="renew-info-item">
                            <span className="renew-info-label">Chủ thẻ</span>
                            <span className="renew-info-value">{cardData.customer}</span>
                        </div>
                        <div className="renew-info-item">
                            <span className="renew-info-label">Hạn dùng hiện tại</span>
                            <span className="renew-info-value" style={{ color: cardData.status === 'Đã hết hạn' ? '#ef4444' : '#1e293b' }}>
                                {cardData.endDate}
                            </span>
                        </div>
                    </div>

                    <div className="renew-form-group">
                        <label htmlFor="package-select">Gói cước gia hạn</label>
                        {loadingPackages ? (
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Đang tải danh sách gói cước...</div>
                        ) : (
                            <select
                                id="package-select"
                                className="renew-select"
                                value={selectedMonths}
                                onChange={(e) => setSelectedMonths(e.target.value)}
                                disabled={isSubmitting}
                            >
                                {packages.map((pkg) => (
                                    <option key={pkg.months} value={pkg.months.toString()}>
                                        {pkg.months} tháng ({formatCurrency(pkg.price)})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="renew-form-group">
                        <label htmlFor="new-expiry-display">Ngày hết hạn dự kiến</label>
                        <input
                            id="new-expiry-display"
                            type="text"
                            className="renew-select"
                            value={formattedNewExpiry}
                            readOnly
                            style={{ backgroundColor: '#f1f5f9', cursor: 'default', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div className="renew-form-group">
                        <label htmlFor="renew-note">Ghi chú</label>
                        <textarea
                            id="renew-note"
                            className="renew-textarea"
                            placeholder="Nhập ghi chú gia hạn (nếu có)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="renew-price-box">
                        <span className="renew-price-title">Tổng chi phí</span>
                        <span className="renew-price-value">{formatCurrency(price)}</span>
                    </div>

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
                            type="submit"
                            className="renew-btn primary"
                            disabled={isSubmitting || loadingPackages}
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận gia hạn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
