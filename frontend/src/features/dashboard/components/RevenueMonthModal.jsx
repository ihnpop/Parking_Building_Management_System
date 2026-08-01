import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { fetchMonthlyRevenueDetails, formatVND } from '../../../service/dashboardApi';
import "./RevenueMonthModal.css";

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
                        <div className="rmm-loading-container">
                            <span className="material-symbols-outlined rmm-loading-spin">refresh</span>
                            <p className="rmm-loading-text">Đang tổng hợp dữ liệu doanh thu...</p>
                        </div>
                    ) : !monthData || totalMonthRevenue === 0 ? (
                        <div className="rmm-empty-container">
                            <span className="material-symbols-outlined rmm-empty-icon">receipt_long</span>
                            <p className="rmm-empty-text">
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
                            <div className="rmm-weeks-list">
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
                                                    <span className={`material-symbols-outlined rmm-accordion-icon ${isExpanded ? 'rmm-accordion-icon--active' : 'rmm-accordion-icon--inactive'}`}>
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
                                                    <div className="rmm-category-block">
                                                        <div className="rmm-category-header">
                                                            <span className="material-symbols-outlined rmm-category-icon rmm-category-icon--casual">confirmation_number</span>
                                                            Thẻ lượt
                                                        </div>
                                                        {casualEntries.length === 0 ? (
                                                            <div className="revenue-empty-text">Chưa phát sinh</div>
                                                        ) : (
                                                            <div className="rmm-casual-list">
                                                                {casualEntries.map(([vType, rev], idx) => (
                                                                    <div key={idx} className="rmm-casual-chip">
                                                                        <span className="rmm-casual-label">{vType}: </span>
                                                                        <strong className="rmm-casual-val">{formatVND(rev)}</strong>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 2. Đăng ký thẻ tháng */}
                                                    <div className="rmm-category-block">
                                                        <div className="rmm-category-header">
                                                            <span className="material-symbols-outlined rmm-category-icon rmm-category-icon--monthly">card_membership</span>
                                                            Đăng ký thẻ tháng
                                                        </div>
                                                        {monthlyNewItems.length === 0 ? (
                                                            <div className="revenue-empty-text">Chưa phát sinh</div>
                                                        ) : (
                                                            <div className="rmm-items-column">
                                                                {monthlyNewItems.map((item, idx) => (
                                                                    <div key={idx} className="revenue-row-item rmm-row-item">
                                                                        <span className="rmm-item-text">
                                                                            <strong className="rmm-item-pkg--monthly">{item.packageName}</strong> 
                                                                            <span className="rmm-item-sub--monthly">({item.vehicleType} • Số lượt: {item.count})</span>
                                                                        </span>
                                                                        <span className="rmm-item-rev--monthly">{formatVND(item.revenue)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 3. Gia hạn thẻ tháng */}
                                                    <div className="rmm-category-block">
                                                        <div className="rmm-category-header">
                                                            <span className="material-symbols-outlined rmm-category-icon rmm-category-icon--renewal">autorenew</span>
                                                            Gia hạn thẻ tháng
                                                        </div>
                                                        {renewalItems.length === 0 ? (
                                                            <div className="revenue-empty-text">Chưa phát sinh</div>
                                                        ) : (
                                                            <div className="rmm-items-column">
                                                                {renewalItems.map((item, idx) => (
                                                                    <div key={idx} className="revenue-row-item rmm-row-item--renewal">
                                                                        <span className="rmm-item-text">
                                                                            <strong className="rmm-item-pkg--renewal">{item.packageName}</strong> 
                                                                            <span className="rmm-item-sub--renewal">({item.vehicleType} • Số lượt: {item.count})</span>
                                                                        </span>
                                                                        <span className="rmm-item-rev--renewal">{formatVND(item.revenue)}</span>
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
