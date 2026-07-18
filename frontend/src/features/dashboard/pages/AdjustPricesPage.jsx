import React, { useState } from 'react';
import { useNotification } from '../../../context/NotificationContext';
import { EditSessionPriceModal, EditMonthlyPriceModal } from '../components/EditPricesDialog';

// ─── Mock dữ liệu giá hiện tại ────────────────────────────────────────────────
const initialSessionPrices = [
    { id: 1, vehicleType: 'Xe máy', icon: 'two_wheeler', firstHour: 5000, extraHour: 3000, dayMax: 30000, color: '#3B82F6' },
    { id: 2, vehicleType: 'Ô tô', icon: 'directions_car', firstHour: 15000, extraHour: 10000, dayMax: 100000, color: '#8B5CF6' },
];

const initialMonthlyPrices = [
    { id: 1, vehicleType: 'Xe máy', icon: 'two_wheeler', price1Month: 200000, price3Month: 550000, price6Month: 1000000, price12Month: 1800000, color: '#3B82F6' },
    { id: 2, vehicleType: 'Ô tô', icon: 'directions_car', price1Month: 800000, price3Month: 2200000, price6Month: 4000000, price12Month: 7200000, color: '#8B5CF6' },
];

const formatVND = (value) => {
    if (!value && value !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const parseNumber = (str) => {
    if (typeof str !== 'string') {
        str = String(str);
    }
    const num = parseInt(str.replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? 0 : num;
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdjustPricesPage() {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState('session');
    const [sessionPrices, setSessionPrices] = useState(initialSessionPrices);
    const [monthlyPrices, setMonthlyPrices] = useState(initialMonthlyPrices);
    const [editingSession, setEditingSession] = useState(null);
    const [editingMonthly, setEditingMonthly] = useState(null);

    const handleSaveSession = (updated) => {
        setSessionPrices(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingSession(null);
        showToast(`Đã cập nhật giá lượt cho ${updated.vehicleType}!`, 'success');
    };

    const handleSaveMonthly = (updated) => {
        setMonthlyPrices(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditingMonthly(null);
        showToast(`Đã cập nhật giá tháng cho ${updated.vehicleType}!`, 'success');
    };

    return (
        <div className="ap-page">
            {/* ── Header ── */}
            <div className="ap-header">
                <div className="ap-header-left">
                    <div className="ap-header-icon">
                        <span className="material-symbols-outlined">price_change</span>
                    </div>
                    <div>
                        <h1 className="ap-page-title">Điều chỉnh giá dịch vụ</h1>
                        <p className="ap-page-subtitle">Quản lý biểu giá lượt và giá tháng cho từng loại xe</p>
                    </div>
                </div>
                <div className="ap-header-badge">
                    <span className="material-symbols-outlined">shield_person</span>
                    <span>Chỉ dành cho Quản lý</span>
                </div>
            </div>

            {/* ── Tab switcher ── */}
            <div className="ap-tabs">
                <button
                    className={`ap-tab ${activeTab === 'session' ? 'ap-tab--active' : ''}`}
                    onClick={() => setActiveTab('session')}
                >
                    <span className="material-symbols-outlined">timer</span>
                    Giá theo lượt
                    <span className="ap-tab-count">{sessionPrices.length}</span>
                </button>
                <button
                    className={`ap-tab ${activeTab === 'monthly' ? 'ap-tab--active' : ''}`}
                    onClick={() => setActiveTab('monthly')}
                >
                    <span className="material-symbols-outlined">calendar_month</span>
                    Giá theo tháng
                    <span className="ap-tab-count">{monthlyPrices.length}</span>
                </button>
            </div>

            {/* ── SESSION PRICES TAB ── */}
            {activeTab === 'session' && (
                <div className="ap-section">
                    <div className="ap-section-info">
                        <span className="material-symbols-outlined">info</span>
                        <span>Giá lượt tính theo giờ. Khách gửi xe trả tiền theo thời gian thực tế.</span>
                    </div>

                    <div className="ap-cards-grid">
                        {sessionPrices.map(item => (
                            <div key={item.id} className="ap-price-card" style={{ '--card-accent': item.color }}>
                                <div className="ap-card-header">
                                    <div className="ap-card-icon" style={{ background: `${item.color}18`, color: item.color }}>
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <div className="ap-card-title-block">
                                        <h3 className="ap-card-name">{item.vehicleType}</h3>
                                        <span className="ap-card-type-badge">Giá lượt</span>
                                    </div>
                                    <button
                                        className="ap-edit-btn"
                                        onClick={() => setEditingSession(item)}
                                        title="Chỉnh sửa giá"
                                    >
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                </div>

                                <div className="ap-card-body">
                                    <div className="ap-price-row">
                                        <div className="ap-price-item">
                                            <span className="ap-price-label">Giờ đầu</span>
                                            <span className="ap-price-value" style={{ color: item.color }}>{formatVND(item.firstHour)}</span>
                                        </div>
                                        <div className="ap-price-divider" />
                                        <div className="ap-price-item">
                                            <span className="ap-price-label">Giờ tiếp theo</span>
                                            <span className="ap-price-value" style={{ color: item.color }}>{formatVND(item.extraHour)}</span>
                                        </div>
                                    </div>

                                    <div className="ap-day-max-row">
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94a3b8' }}>today</span>
                                        <span className="ap-day-max-label">Tối đa / ngày:</span>
                                        <span className="ap-day-max-value" style={{ color: item.color }}>{formatVND(item.dayMax)}</span>
                                    </div>
                                </div>

                                <div className="ap-card-accent-bar" style={{ background: item.color }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MONTHLY PRICES TAB ── */}
            {activeTab === 'monthly' && (
                <div className="ap-section">
                    <div className="ap-section-info">
                        <span className="material-symbols-outlined">info</span>
                        <span>Giá tháng áp dụng khi khách đăng ký gói. Thời hạn theo từng gói đã chọn.</span>
                    </div>

                    <div className="ap-monthly-grid">
                        {monthlyPrices.map(item => (
                            <div key={item.id} className="ap-monthly-card" style={{ '--card-accent': item.color }}>
                                <div className="ap-card-header">
                                    <div className="ap-card-icon" style={{ background: `${item.color}18`, color: item.color }}>
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                    </div>
                                    <div className="ap-card-title-block">
                                        <h3 className="ap-card-name">{item.vehicleType}</h3>
                                        <span className="ap-card-type-badge ap-card-type-badge--monthly">Giá tháng</span>
                                    </div>
                                    <button
                                        className="ap-edit-btn"
                                        onClick={() => setEditingMonthly(item)}
                                        title="Chỉnh sửa giá"
                                    >
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                </div>

                                <div className="ap-monthly-packages">
                                    <div className="ap-pkg-row">
                                        <div className="ap-pkg-cell">
                                            <span className="ap-pkg-cell-label">1 tháng</span>
                                            <span className="ap-pkg-cell-price" style={{ color: item.color }}>{formatVND(item.price1Month)}</span>
                                            <span className="ap-pkg-cell-per">{formatVND(item.price1Month)}/tháng</span>
                                        </div>
                                        <div className="ap-pkg-cell">
                                            <span className="ap-pkg-cell-label">3 tháng</span>
                                            <span className="ap-pkg-cell-price" style={{ color: item.color }}>{formatVND(item.price3Month)}</span>
                                            <span className="ap-pkg-cell-per">{formatVND(Math.round(item.price3Month / 3))}/tháng</span>
                                        </div>
                                        <div className="ap-pkg-cell">
                                            <span className="ap-pkg-cell-label">6 tháng</span>
                                            <span className="ap-pkg-cell-price" style={{ color: item.color }}>{formatVND(item.price6Month)}</span>
                                            <span className="ap-pkg-cell-per">{formatVND(Math.round(item.price6Month / 6))}/tháng</span>
                                        </div>
                                        <div className="ap-pkg-cell ap-pkg-cell--highlight" style={{ borderColor: item.color }}>
                                            <span className="ap-pkg-best-tag" style={{ background: item.color }}>Tốt nhất</span>
                                            <span className="ap-pkg-cell-label">12 tháng</span>
                                            <span className="ap-pkg-cell-price" style={{ color: item.color }}>{formatVND(item.price12Month)}</span>
                                            <span className="ap-pkg-cell-per">{formatVND(Math.round(item.price12Month / 12))}/tháng</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="ap-card-accent-bar" style={{ background: item.color }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
            {editingSession && (
                <EditSessionPriceModal
                    item={editingSession}
                    onClose={() => setEditingSession(null)}
                    onSave={handleSaveSession}
                />
            )}
            {editingMonthly && (
                <EditMonthlyPriceModal
                    item={editingMonthly}
                    onClose={() => setEditingMonthly(null)}
                    onSave={handleSaveMonthly}
                />
            )}
        </div>
    );
}
