import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { fetchMonthlyRevenueDetails, formatVND } from '../../../service/dashboardApi';

export default function RevenueMonthModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(true);
    const [monthData, setMonthData] = useState(null);
    const [expandedWeek, setExpandedWeek] = useState('week1');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchMonthlyRevenueDetails()
                .then((res) => {
                    setMonthData(res);
                    const firstKey = Object.keys(res?.weeks || {})[0];
                    if (firstKey) setExpandedWeek(firstKey);
                })
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

    const weeks = monthData?.weeks || {};
    const totalMonthRevenue = monthData?.monthTotal || 0;

    // Calculate total summary chip totals
    let totalCasual = 0;
    let totalMonthlyNew = 0;
    let totalRenewals = 0;

    Object.values(weeks).forEach(w => {
        Object.values(w.casual || {}).forEach(val => totalCasual += Number(val) || 0);
        Object.values(w.monthlyNew || {}).forEach(item => totalMonthlyNew += Number(item.revenue) || 0);
        Object.values(w.renewals || {}).forEach(item => totalRenewals += Number(item.revenue) || 0);
    });

    const modalContent = (
        <div 
            className="revenue-modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-revenue-modal-title"
        >
            <div className="revenue-modal revenue-modal--month" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="revenue-modal-header">
                    <div className="revenue-modal-title-group">
                        <div className="revenue-modal-icon revenue-modal-icon--month">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <div>
                            <h3 id="month-revenue-modal-title" className="revenue-modal-title">
                                Chi tiết doanh thu tháng này
                            </h3>
                            <p className="revenue-modal-subtitle">
                                Tổng hợp doanh thu theo từng tuần trong tháng
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
                            <p style={{ marginTop: '8px', fontSize: '14px' }}>Đang tổng hợp dữ liệu doanh thu...</p>
                        </div>
                    ) : !monthData || totalMonthRevenue === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>receipt_long</span>
                            <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500, color: '#64748b' }}>
                                Chưa phát sinh doanh thu tháng này
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <div className="revenue-summary-card revenue-summary-card--month">
                                <div className="revenue-summary-top">
                                    <span className="revenue-summary-label">TỔNG DOANH THU THÁNG NÀY</span>
                                    <span className="revenue-summary-amount">{formatVND(totalMonthRevenue)}</span>
                                </div>
                                <div className="revenue-summary-chips">
                                    <div className="revenue-chip">
                                        <span className="revenue-chip-title">Thẻ lượt</span>
                                        <span className="revenue-chip-value">{formatVND(totalCasual)}</span>
                                    </div>
                                    <div className="revenue-chip">
                                        <span className="revenue-chip-title">Đăng ký tháng</span>
                                        <span className="revenue-chip-value">{formatVND(totalMonthlyNew)}</span>
                                    </div>
                                    <div className="revenue-chip">
                                        <span className="revenue-chip-title">Gia hạn</span>
                                        <span className="revenue-chip-value">{formatVND(totalRenewals)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Accordion List by Week */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.values(weeks).map((w) => {
                                    const isExpanded = expandedWeek === w.id;
                                    const casualEntries = Object.entries(w.casual || {});
                                    const monthlyNewItems = Object.values(w.monthlyNew || {});
                                    const renewalItems = Object.values(w.renewals || {});

                                    return (
                                        <div 
                                            key={w.id} 
                                            className={`revenue-accordion-item ${isExpanded ? 'revenue-accordion-item--active' : ''}`}
                                        >
                                            {/* Accordion Bar */}
                                            <div
                                                className="revenue-accordion-header"
                                                onClick={() => setExpandedWeek(isExpanded ? null : w.id)}
                                            >
                                                <div className="revenue-accordion-title">
                                                    <span className="material-symbols-outlined" style={{ color: isExpanded ? '#2563eb' : '#64748b', fontSize: '20px' }}>
                                                        {isExpanded ? 'expand_more' : 'chevron_right'}
                                                    </span>
                                                    <span>{w.label}</span>
                                                </div>
                                                <span className="revenue-accordion-amount">
                                                    {formatVND(w.totalRevenue)}
                                                </span>
                                            </div>

                                            {/* Accordion Content */}
                                            {isExpanded && (
                                                <div className="revenue-accordion-content">
                                                    
                                                    {/* 1. Thẻ lượt */}
                                                    <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>confirmation_number</span>
                                                            Thẻ lượt
                                                        </div>
                                                        {casualEntries.length === 0 ? (
                                                            <div className="revenue-empty-text">Chưa phát sinh</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px' }}>
                                                                {casualEntries.map(([vType, rev], idx) => (
                                                                    <div key={idx} style={{ backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                        <span style={{ color: '#64748b' }}>{vType}: </span>
                                                                        <strong style={{ color: '#0f172a' }}>{formatVND(rev)}</strong>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 2. Đăng ký thẻ tháng */}
                                                    <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16a34a' }}>card_membership</span>
                                                            Đăng ký thẻ tháng
                                                        </div>
                                                        {monthlyNewItems.length === 0 ? (
                                                            <div className="revenue-empty-text">Chưa phát sinh</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {monthlyNewItems.map((item, idx) => (
                                                                    <div key={idx} className="revenue-row-item" style={{ padding: '8px 12px' }}>
                                                                        <span style={{ fontSize: '13px' }}>
                                                                            <strong style={{ color: '#0f172a' }}>{item.packageName}</strong> 
                                                                            <span style={{ color: '#64748b', marginLeft: '6px' }}>({item.vehicleType} • Số lượt: {item.count})</span>
                                                                        </span>
                                                                        <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>{formatVND(item.revenue)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 3. Gia hạn thẻ tháng */}
                                                    <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#d97706' }}>autorenew</span>
                                                            Gia hạn thẻ tháng
                                                        </div>
                                                        {renewalItems.length === 0 ? (
                                                            <div className="revenue-empty-text">Chưa phát sinh</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {renewalItems.map((item, idx) => (
                                                                    <div key={idx} className="revenue-row-item" style={{ padding: '8px 12px', backgroundColor: '#fffbe6', borderColor: '#fef08a' }}>
                                                                        <span style={{ fontSize: '13px' }}>
                                                                            <strong style={{ color: '#92400e' }}>{item.packageName}</strong> 
                                                                            <span style={{ color: '#b45309', marginLeft: '6px' }}>({item.vehicleType} • Số lượt: {item.count})</span>
                                                                        </span>
                                                                        <span style={{ fontWeight: 700, color: '#b45309', fontSize: '14px' }}>{formatVND(item.revenue)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
