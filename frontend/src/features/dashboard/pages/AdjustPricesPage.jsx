import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../context/NotificationContext';
import { EditSessionPriceModal, EditMonthlyPriceModal, EditReissueFeeModal } from '../components/EditPricesDialog';
import { getPrices, updateSessionPrices, updateMonthlyPrices, updateCardReissueFee } from '../../../service/priceApi';

const formatVND = (value) => {
    if (!value && value !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdjustPricesPage() {
    const { showToast } = useNotification();
    const [activeTab, setActiveTab] = useState('session');
    const [buildingName, setBuildingName] = useState('');
    const [sessionPrices, setSessionPrices] = useState([]);
    const [monthlyPrices, setMonthlyPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [editingSession, setEditingSession] = useState(null);
    const [editingMonthly, setEditingMonthly] = useState(null);
    const [cardReissueFee, setCardReissueFee] = useState(50000);
    const [isEditingReissueFee, setIsEditingReissueFee] = useState(false);
    const [tempReissueFee, setTempReissueFee] = useState('');

    const fetchPrices = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPrices();
            setBuildingName(data.buildingName || '');
            setSessionPrices(data.sessionPrices || []);
            setMonthlyPrices(data.monthlyPrices || []);
            setCardReissueFee(data.cardReissueFee ?? 50000);
            setTempReissueFee(data.cardReissueFee ?? 50000);
        } catch (err) {
            console.error("Lỗi tải thông tin biểu giá:", err);
            const msg = err.response?.data?.message || err.message || "Không thể tải bảng giá từ máy chủ.";
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    const handleSaveSession = async (updated) => {
        try {
            setSaving(true);
            const data = await updateSessionPrices({
                vehicleTypeId: updated.vehicleTypeId || updated.id,
                timeSlots: updated.timeSlots,
                firstHour: updated.firstHour,
                extraHour: updated.extraHour,
                dayMax: updated.dayMax,
            });

            if (data) {
                setSessionPrices(data.sessionPrices || []);
                setMonthlyPrices(data.monthlyPrices || []);
            }
            setEditingSession(null);
            showToast(`Đã cập nhật biểu giá lượt thành công cho ${updated.vehicleType}!`, 'success');
        } catch (err) {
            console.error("Lỗi cập nhật giá lượt:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi cập nhật biểu giá lượt";
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveMonthly = async (updated) => {
        try {
            setSaving(true);
            const data = await updateMonthlyPrices({
                vehicleTypeId: updated.vehicleTypeId || updated.id,
                vehicleType: updated.vehicleType,
                price1Month: updated.price1Month,
                price3Month: updated.price3Month,
                price6Month: updated.price6Month,
                price12Month: updated.price12Month,
            });
            if (data) {
                setSessionPrices(data.sessionPrices || []);
                setMonthlyPrices(data.monthlyPrices || []);
            }
            setEditingMonthly(null);
            showToast(`Đã cập nhật biểu giá tháng thành công cho ${updated.vehicleType}!`, 'success');
        } catch (err) {
            console.error("Lỗi cập nhật giá tháng:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi cập nhật biểu giá tháng";
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveReissueFee = async (newFee) => {
        const fee = Number(newFee !== undefined ? newFee : tempReissueFee);
        if (isNaN(fee) || fee < 0) {
            showToast('Phí cấp lại thẻ không hợp lệ', 'error');
            return;
        }
        try {
            setSaving(true);
            await updateCardReissueFee({ cardReissueFee: fee });
            setCardReissueFee(fee);
            setTempReissueFee(fee); // Cập nhật lại state nội bộ
            setIsEditingReissueFee(false);
            showToast('Đã cập nhật phí dịch vụ thành công!', 'success');
        } catch (err) {
            console.error("Lỗi cập nhật phí cấp lại thẻ:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi cập nhật phí dịch vụ";
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="ap-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    <p style={{ marginTop: '12px', fontWeight: '500' }}>Đang tải biểu giá tòa nhà...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ap-page" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#dc2626' }}>warning</span>
                    <h3 style={{ color: '#991b1b', marginTop: '12px' }}>Không thể tải bảng giá</h3>
                    <p style={{ color: '#b91c1c', fontSize: '0.9rem', marginTop: '8px' }}>{error}</p>
                    <button
                        onClick={fetchPrices}
                        style={{ marginTop: '16px', padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mc-page">
            {/* ── Action Bar (tab switcher + info) ── */}
            <div className="mc-action-bar">
                <div className="mc-filters" style={{ gap: '8px' }}>
                    <button
                        className={`mc-btn ${activeTab === 'session' ? 'mc-btn-primary' : 'mc-btn-outline'}`}
                        onClick={() => setActiveTab('session')}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>timer</span>
                        Giá theo lượt
                    </button>
                    <button
                        className={`mc-btn ${activeTab === 'monthly' ? 'mc-btn-primary' : 'mc-btn-outline'}`}
                        onClick={() => setActiveTab('monthly')}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                        Giá theo tháng
                    </button>
                </div>
            </div>

            {/* ── SESSION PRICES TAB ── */}
            {activeTab === 'session' && (
                <div className="mc-table-card" style={{ padding: '20px' }}>
                    <div className="ap-section-info" style={{ marginBottom: '20px' }}>
                        <span className="material-symbols-outlined">info</span>
                        <span>Giá lượt tính theo giờ. Khách gửi xe trả tiền theo thời gian thực tế trong tòa nhà.</span>
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
                                        className="mc-btn mc-btn-outline"
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                        onClick={() => setEditingSession(item)}
                                        title="Chỉnh sửa giá"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                        Sửa
                                    </button>
                                </div>

                                <div className="ap-card-body">
                                    {item.timeSlots && item.timeSlots.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                                            {item.timeSlots.map((s, sIdx) => (
                                                <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                                    <span style={{ color: '#64748b', fontWeight: 500 }}>Khung {sIdx + 1} ({s.min}h – {s.max >= 24 ? 'hết ngày' : `${s.max}h`}):</span>
                                                    <strong style={{ color: item.color, fontWeight: 700 }}>{formatVND(s.price)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
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
                                    )}

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
                <div className="mc-table-card" style={{ padding: '20px' }}>
                    <div className="ap-section-info" style={{ marginBottom: '20px' }}>
                        <span className="material-symbols-outlined">info</span>
                        <span>Giá tháng áp dụng khi khách đăng ký gói vé tháng tại tòa nhà.</span>
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
                                        className="mc-btn mc-btn-outline"
                                        style={{ padding: '8px 12px', fontSize: '13px' }}
                                        onClick={() => setEditingMonthly(item)}
                                        title="Chỉnh sửa giá"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                        Sửa
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

            {/* ── PHÍ DỊCH VỤ KHÁC ── */}
            <div className="mc-table-card" style={{ padding: '20px', marginTop: '20px' }}>
                <div className="ap-section-info" style={{ marginBottom: '20px' }}>
                    <span className="material-symbols-outlined">info</span>
                    <span>Phí dịch vụ khác áp dụng cho các trường hợp như làm mất thẻ, cấp lại thẻ mới.</span>
                </div>
                <div className="ap-cards-grid">
                    <div className="ap-price-card" style={{ '--card-accent': '#3b82f6' }}>
                        <div className="ap-card-header">
                            <div className="ap-card-icon" style={{ background: '#3b82f618', color: '#3b82f6' }}>
                                <span className="material-symbols-outlined">credit_card</span>
                            </div>
                            <div className="ap-card-title-block">
                                <h3 className="ap-card-name" style={{ whiteSpace: 'nowrap' }}>Phí dịch vụ</h3>
                                <span className="ap-card-type-badge" style={{ background: '#3b82f618', color: '#3b82f6' }}>Dịch vụ</span>
                            </div>
                            <button
                                className="mc-btn mc-btn-outline"
                                style={{ padding: '8px 12px', fontSize: '13px' }}
                                onClick={() => setIsEditingReissueFee(true)}
                                title="Chỉnh sửa phí"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                Sửa
                            </button>
                        </div>

                        <div className="ap-card-body">
                            <div className="ap-day-max-row" style={{ marginTop: '12px', justifyContent: 'center', background: 'transparent', border: 'none' }}>
                                <span className="ap-day-max-value" style={{ color: '#3b82f6', fontSize: '24px' }}>{formatVND(cardReissueFee)}</span>
                            </div>
                        </div>
                        <div className="ap-card-accent-bar" style={{ background: '#3b82f6' }} />
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            {editingSession && (
                <EditSessionPriceModal
                    item={editingSession}
                    saving={saving}
                    onClose={() => setEditingSession(null)}
                    onSave={handleSaveSession}
                />
            )}
            {editingMonthly && (
                <EditMonthlyPriceModal
                    item={editingMonthly}
                    saving={saving}
                    onClose={() => setEditingMonthly(null)}
                    onSave={handleSaveMonthly}
                />
            )}
            {isEditingReissueFee && (
                <EditReissueFeeModal
                    fee={cardReissueFee}
                    saving={saving}
                    onClose={() => setIsEditingReissueFee(false)}
                    onSave={handleSaveReissueFee}
                />
            )}
        </div>
    );
}
