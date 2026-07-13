import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { fetchTodayRevenueDetails, formatVND } from '../../../service/dashboardService';

export default function RevenueTodayModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchTodayRevenueDetails()
                .then((res) => setData(res))
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="revenue-modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="today-revenue-modal-title"
        >
            <div className="revenue-modal" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="revenue-modal-header">
                    <div className="revenue-modal-title-group">
                        <div className="revenue-modal-icon revenue-modal-icon--today">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                        <div>
                            <h3 id="today-revenue-modal-title" className="revenue-modal-title">
                                Chi tiết doanh thu hôm nay
                            </h3>
                            <p className="revenue-modal-subtitle">
                                Phân tích các khoản thu phát sinh trong ngày
                            </p>
                        </div>
                    </div>
                    <button
                        className="revenue-modal-close-btn"
                        onClick={onClose}
                        aria-label="Đóng modal"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="revenue-modal-body">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '32px' }}>refresh</span>
                            <p style={{ marginTop: '8px', fontSize: '14px' }}>Đang tải dữ liệu doanh thu...</p>
                        </div>
                    ) : !data || data.total === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>receipt_long</span>
                            <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500, color: '#64748b' }}>
                                Chưa phát sinh doanh thu hôm nay
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <div className="revenue-summary-card revenue-summary-card--today">
                                <div className="revenue-summary-top">
                                    <span className="revenue-summary-label">TỔNG DOANH THU HÔM NAY</span>
                                    <span className="revenue-summary-amount">{formatVND(data.total)}</span>
                                </div>
                                <div className="revenue-summary-chips">
                                    <div className="revenue-chip">
                                        <span className="revenue-chip-title">Thẻ lượt</span>
                                        <span className="revenue-chip-value">{formatVND(data.casual?.total || 0)}</span>
                                    </div>
                                    <div className="revenue-chip">
                                        <span className="revenue-chip-title">Đăng ký tháng</span>
                                        <span className="revenue-chip-value">{formatVND(data.monthlyNew?.total || 0)}</span>
                                    </div>
                                    <div className="revenue-chip">
                                        <span className="revenue-chip-title">Gia hạn</span>
                                        <span className="revenue-chip-value">{formatVND(data.renewals?.total || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 1: Thẻ lượt */}
                            <div className="revenue-section">
                                <div className="revenue-section-header">
                                    <span className="revenue-section-title">
                                        <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>confirmation_number</span>
                                        Thẻ lượt
                                    </span>
                                    <span className="revenue-section-amount" style={{ color: '#0284c7' }}>
                                        {formatVND(data.casual?.total || 0)}
                                    </span>
                                </div>

                                {(!data.casual?.items || data.casual.items.length === 0) ? (
                                    <div className="revenue-empty-text">Chưa phát sinh</div>
                                ) : (
                                    <div className="revenue-grid-2">
                                        {data.casual.items.map((item, idx) => (
                                            <div key={idx} className="revenue-box-item">
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{item.vehicleType}</div>
                                                <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', marginTop: '2px' }}>{formatVND(item.revenue)}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Số lượt: {item.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Đăng ký thẻ tháng */}
                            <div className="revenue-section">
                                <div className="revenue-section-header">
                                    <span className="revenue-section-title">
                                        <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>card_membership</span>
                                        Đăng ký thẻ tháng
                                    </span>
                                    <span className="revenue-section-amount" style={{ color: '#16a34a' }}>
                                        {formatVND(data.monthlyNew?.total || 0)}
                                    </span>
                                </div>

                                {(!data.monthlyNew?.items || data.monthlyNew.items.length === 0) ? (
                                    <div className="revenue-empty-text">Chưa phát sinh</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {data.monthlyNew.items.map((item, idx) => (
                                            <div key={idx} className="revenue-row-item">
                                                <div>
                                                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{item.packageName}</span>
                                                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>({item.vehicleType} • Số lượt: {item.count})</span>
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '15px' }}>{formatVND(item.revenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Gia hạn thẻ tháng */}
                            <div className="revenue-section">
                                <div className="revenue-section-header">
                                    <span className="revenue-section-title">
                                        <span className="material-symbols-outlined" style={{ color: '#d97706' }}>autorenew</span>
                                        Gia hạn thẻ tháng
                                    </span>
                                    <span className="revenue-section-amount" style={{ color: '#d97706' }}>
                                        {formatVND(data.renewals?.total || 0)}
                                    </span>
                                </div>

                                {(!data.renewals?.items || data.renewals.items.length === 0) ? (
                                    <div className="revenue-empty-text">Chưa phát sinh</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {data.renewals.items.map((item, idx) => (
                                            <div key={idx} className="revenue-row-item" style={{ backgroundColor: '#fffbe6', borderColor: '#fef08a' }}>
                                                <div>
                                                    <span style={{ fontWeight: 600, color: '#92400e', fontSize: '14px' }}>{item.packageName}</span>
                                                    <span style={{ fontSize: '12px', color: '#b45309', marginLeft: '8px' }}>({item.vehicleType} • Số lượt: {item.count})</span>
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#b45309', fontSize: '15px' }}>{formatVND(item.revenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="revenue-modal-footer">
                    <button className="revenue-modal-btn-close" onClick={onClose}>
                        Đóng
                    </button>
                </div>

            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
