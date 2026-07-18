import React, { useState } from 'react';

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

// ─── Edit Session Price Modal ──────────────────────────────────────────────────
export function EditSessionPriceModal({ item, onClose, onSave }) {
    const [firstHour, setFirstHour] = useState(item.firstHour);
    const [extraHour, setExtraHour] = useState(item.extraHour);
    const [dayMax, setDayMax] = useState(item.dayMax);

    const handleSave = () => {
        onSave({ ...item, firstHour, extraHour, dayMax });
    };

    return (
        <div className="ap-modal-overlay" onClick={onClose}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
                <div className="ap-modal-header">
                    <div className="ap-modal-icon" style={{ background: `${item.color}20`, color: item.color }}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                        <h3 className="ap-modal-title">Chỉnh sửa giá lượt</h3>
                        <p className="ap-modal-subtitle">{item.vehicleType}</p>
                    </div>
                    <button className="ap-modal-close" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="ap-modal-body">
                    <div className="ap-field-group">
                        <label className="ap-field-label">
                            <span className="material-symbols-outlined">schedule</span>
                            Giá giờ đầu (VNĐ)
                        </label>
                        <div className="ap-input-wrapper">
                            <input
                                className="ap-input"
                                type="number"
                                value={firstHour}
                                min="0"
                                step="1000"
                                onChange={e => setFirstHour(parseNumber(e.target.value))}
                            />
                            <span className="ap-input-suffix">₫</span>
                        </div>
                        <p className="ap-field-hint">Áp dụng cho giờ đầu tiên khi xe vào</p>
                    </div>

                    <div className="ap-field-group">
                        <label className="ap-field-label">
                            <span className="material-symbols-outlined">more_time</span>
                            Giá mỗi 4 giờ tiếp theo (VNĐ)
                        </label>
                        <div className="ap-input-wrapper">
                            <input
                                className="ap-input"
                                type="number"
                                value={extraHour}
                                min="0"
                                step="1000"
                                onChange={e => setExtraHour(parseNumber(e.target.value))}
                            />
                            <span className="ap-input-suffix">₫</span>
                        </div>
                        <p className="ap-field-hint">Tính từ giờ thứ 4 trở đi</p>
                    </div>

                    <div className="ap-field-group">
                        <label className="ap-field-label">
                            <span className="material-symbols-outlined">today</span>
                            Giá tối đa 1 ngày (VNĐ)
                        </label>
                        <div className="ap-input-wrapper">
                            <input
                                className="ap-input"
                                type="number"
                                value={dayMax}
                                min="0"
                                step="1000"
                                onChange={e => setDayMax(parseNumber(e.target.value))}
                            />
                            <span className="ap-input-suffix">₫</span>
                        </div>
                        <p className="ap-field-hint">Mức tối đa tính phí trong 1 ngày</p>
                    </div>

                    <div className="ap-price-preview">
                        <div className="ap-preview-label">Xem trước</div>
                        <div className="ap-preview-row">
                            <span>Giờ đầu:</span>
                            <strong style={{ color: item.color }}>{formatVND(firstHour)}</strong>
                        </div>
                        <div className="ap-preview-row">
                            <span>Giờ tiếp theo:</span>
                            <strong style={{ color: item.color }}>{formatVND(extraHour)}</strong>
                        </div>
                        <div className="ap-preview-row">
                            <span>Tối đa/ngày:</span>
                            <strong style={{ color: item.color }}>{formatVND(dayMax)}</strong>
                        </div>
                    </div>
                </div>

                <div className="ap-modal-footer">
                    <button className="ap-btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button className="ap-btn-save" onClick={handleSave} style={{ background: item.color }}>
                        <span className="material-symbols-outlined">save</span>
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Monthly Price Modal ──────────────────────────────────────────────────
export function EditMonthlyPriceModal({ item, onClose, onSave }) {
    const [price1, setPrice1] = useState(item.price1Month);
    const [price3, setPrice3] = useState(item.price3Month);
    const [price6, setPrice6] = useState(item.price6Month);
    const [price12, setPrice12] = useState(item.price12Month);

    const handleSave = () => {
        onSave({ ...item, price1Month: price1, price3Month: price3, price6Month: price6, price12Month: price12 });
    };

    const monthlyField = (label, hint, value, setter, icon) => (
        <div className="ap-field-group">
            <label className="ap-field-label">
                <span className="material-symbols-outlined">{icon}</span>
                {label}
            </label>
            <div className="ap-input-wrapper">
                <input
                    className="ap-input"
                    type="number"
                    value={value}
                    min="0"
                    step="1000"
                    onChange={e => setter(parseNumber(e.target.value))}
                />
                <span className="ap-input-suffix">₫</span>
            </div>
            {hint && <p className="ap-field-hint">{hint}</p>}
        </div>
    );

    return (
        <div className="ap-modal-overlay" onClick={onClose}>
            <div className="ap-modal ap-modal--wide" onClick={e => e.stopPropagation()}>
                <div className="ap-modal-header">
                    <div className="ap-modal-icon" style={{ background: `${item.color}20`, color: item.color }}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                        <h3 className="ap-modal-title">Chỉnh sửa giá tháng</h3>
                        <p className="ap-modal-subtitle">{item.vehicleType}</p>
                    </div>
                    <button className="ap-modal-close" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="ap-modal-body">
                    <div className="ap-fields-grid-2">
                        {monthlyField('Gói 1 tháng', 'Đăng ký theo tháng', price1, setPrice1, 'calendar_month')}
                        {monthlyField('Gói 3 tháng', 'Tiết kiệm hơn gói 1 tháng', price3, setPrice3, 'date_range')}
                        {monthlyField('Gói 6 tháng', 'Tiết kiệm nhiều hơn', price6, setPrice6, 'event_available')}
                        {monthlyField('Gói 12 tháng', 'Ưu đãi tốt nhất năm', price12, setPrice12, 'event_repeat')}
                    </div>

                    <div className="ap-price-preview">
                        <div className="ap-preview-label">Xem trước</div>
                        <div className="ap-preview-grid-4">
                            <div className="ap-preview-pkg">
                                <span className="ap-pkg-duration">1 tháng</span>
                                <span className="ap-pkg-price" style={{ color: item.color }}>{formatVND(price1)}</span>
                                <span className="ap-pkg-monthly">{formatVND(Math.round(price1 / 1))} / tháng</span>
                            </div>
                            <div className="ap-preview-pkg">
                                <span className="ap-pkg-duration">3 tháng</span>
                                <span className="ap-pkg-price" style={{ color: item.color }}>{formatVND(price3)}</span>
                                <span className="ap-pkg-monthly">{formatVND(Math.round(price3 / 3))} / tháng</span>
                            </div>
                            <div className="ap-preview-pkg">
                                <span className="ap-pkg-duration">6 tháng</span>
                                <span className="ap-pkg-price" style={{ color: item.color }}>{formatVND(price6)}</span>
                                <span className="ap-pkg-monthly">{formatVND(Math.round(price6 / 6))} / tháng</span>
                            </div>
                            <div className="ap-preview-pkg ap-preview-pkg--best">
                                <span className="ap-pkg-best-badge">Tốt nhất</span>
                                <span className="ap-pkg-duration">12 tháng</span>
                                <span className="ap-pkg-price" style={{ color: item.color }}>{formatVND(price12)}</span>
                                <span className="ap-pkg-monthly">{formatVND(Math.round(price12 / 12))} / tháng</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ap-modal-footer">
                    <button className="ap-btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button className="ap-btn-save" onClick={handleSave} style={{ background: item.color }}>
                        <span className="material-symbols-outlined">save</span>
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
