import React, { useState } from 'react';

const formatVND = (value) => {
    if (!value && value !== 0) return '0 đ';
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
    const [autoCalculate, setAutoCalculate] = useState(item.dayMax === (item.firstHour + 6 * item.extraHour));
    const [dayMax, setDayMax] = useState(item.dayMax);

    const activeDayMax = autoCalculate ? (firstHour + 6 * extraHour) : dayMax;

    // Validation rules
    const errors = {};
    if (firstHour <= 0) {
        errors.firstHour = 'Giá giờ đầu phải lớn hơn 0 đ.';
    } else if (firstHour % 1000 !== 0) {
        errors.firstHour = 'Giá phải là bội số của 1.000 đ (Ví dụ: 5.000 đ).';
    }

    if (extraHour <= 0) {
        errors.extraHour = 'Giá giờ tiếp theo phải lớn hơn 0 đ.';
    } else if (extraHour % 1000 !== 0) {
        errors.extraHour = 'Giá phải là bội số của 1.000 đ (Ví dụ: 3.000 đ).';
    }

    if (!autoCalculate) {
        if (dayMax <= 0) {
            errors.dayMax = 'Giá tối đa 1 ngày phải lớn hơn 0 đ.';
        } else if (dayMax % 1000 !== 0) {
            errors.dayMax = 'Giá phải là bội số của 1.000 đ (Ví dụ: 30.000 đ).';
        } else if (dayMax < firstHour) {
            errors.dayMax = 'Giá tối đa 1 ngày phải lớn hơn hoặc bằng giá giờ đầu.';
        }
    }

    const hasErrors = Object.keys(errors).length > 0;

    const handleSave = () => {
        if (hasErrors) return;
        onSave({ ...item, firstHour, extraHour, dayMax: activeDayMax });
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
                        <div className={`ap-input-wrapper ${errors.firstHour ? 'ap-input-wrapper--error' : ''}`}>
                            <input
                                className="ap-input"
                                type="number"
                                value={firstHour}
                                min="0"
                                step="1000"
                                onChange={e => setFirstHour(parseNumber(e.target.value))}
                            />
                            <span className="ap-input-suffix">đ</span>
                        </div>
                        {errors.firstHour ? (
                            <p className="ap-error-msg">
                                <span className="material-symbols-outlined">error</span>
                                {errors.firstHour}
                            </p>
                        ) : (
                            <p className="ap-field-hint">Áp dụng cho giờ đầu tiên khi xe vào</p>
                        )}
                    </div>

                    <div className="ap-field-group">
                        <label className="ap-field-label">
                            <span className="material-symbols-outlined">more_time</span>
                            Giá mỗi 4 giờ tiếp theo (VNĐ)
                        </label>
                        <div className={`ap-input-wrapper ${errors.extraHour ? 'ap-input-wrapper--error' : ''}`}>
                            <input
                                className="ap-input"
                                type="number"
                                value={extraHour}
                                min="0"
                                step="1000"
                                onChange={e => setExtraHour(parseNumber(e.target.value))}
                            />
                            <span className="ap-input-suffix">đ</span>
                        </div>
                        {errors.extraHour ? (
                            <p className="ap-error-msg">
                                <span className="material-symbols-outlined">error</span>
                                {errors.extraHour}
                            </p>
                        ) : (
                            <p className="ap-field-hint">Tính từ giờ thứ 4 trở đi</p>
                        )}
                    </div>

                    <div className="ap-field-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="ap-field-label">
                                <span className="material-symbols-outlined">today</span>
                                Giá tối đa 1 ngày (VNĐ)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={autoCalculate}
                                    onChange={e => setAutoCalculate(e.target.checked)}
                                    style={{ width: '14px', height: '14px', accentColor: item.color }}
                                />
                                Tự động tính (24h)
                            </label>
                        </div>
                        <div className={`ap-input-wrapper ${errors.dayMax ? 'ap-input-wrapper--error' : ''}`} style={{ opacity: autoCalculate ? 0.75 : 1, background: autoCalculate ? '#f1f5f9' : '#fff' }}>
                            <input
                                className="ap-input"
                                type="number"
                                value={activeDayMax}
                                min="0"
                                step="1000"
                                onChange={e => setDayMax(parseNumber(e.target.value))}
                                disabled={autoCalculate}
                            />
                            <span className="ap-input-suffix">đ</span>
                        </div>
                        {autoCalculate ? (
                            <p className="ap-field-hint" style={{ color: item.color, fontWeight: '500' }}>
                                Công thức: Giờ đầu + 6 × Giá 4h tiếp theo
                            </p>
                        ) : errors.dayMax ? (
                            <p className="ap-error-msg">
                                <span className="material-symbols-outlined">error</span>
                                {errors.dayMax}
                            </p>
                        ) : (
                            <p className="ap-field-hint">Mức tối đa tính phí trong 1 ngày</p>
                        )}
                    </div>

                    <div className="ap-price-preview">
                        <div className="ap-preview-label">Xem trước</div>
                        <div className="ap-preview-row">
                            <span>Giờ đầu:</span>
                            <strong style={{ color: item.color }}>{formatVND(firstHour)}</strong>
                        </div>
                        <div className="ap-preview-row">
                            <span>4 Giờ tiếp theo:</span>
                            <strong style={{ color: item.color }}>{formatVND(extraHour)}</strong>
                        </div>
                        <div className="ap-preview-row">
                            <span>Tối đa/ngày:</span>
                            <strong style={{ color: item.color }}>{formatVND(activeDayMax)}</strong>
                        </div>
                    </div>
                </div>

                <div className="ap-modal-footer">
                    <button className="ap-btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button
                        className="ap-btn-save"
                        onClick={handleSave}
                        style={{ background: hasErrors ? '#cbd5e1' : item.color, cursor: hasErrors ? 'not-allowed' : 'pointer' }}
                        disabled={hasErrors}
                    >
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

    // Validation rules
    const errors = {};
    if (price1 <= 0) {
        errors.price1 = 'Giá gói 1 tháng phải lớn hơn 0 đ.';
    } else if (price1 % 1000 !== 0) {
        errors.price1 = 'Giá phải là bội số của 1.000 đ.';
    }

    if (price3 <= 0) {
        errors.price3 = 'Giá gói 3 tháng phải lớn hơn 0 đ.';
    } else if (price3 % 1000 !== 0) {
        errors.price3 = 'Giá phải là bội số của 1.000 đ.';
    } else if (price3 > price1 * 3) {
        errors.price3 = `Gói 3 tháng nên rẻ hơn hoặc bằng 3 gói lẻ 1 tháng (${formatVND(price1 * 3)}).`;
    }

    if (price6 <= 0) {
        errors.price6 = 'Giá gói 6 tháng phải lớn hơn 0 đ.';
    } else if (price6 % 1000 !== 0) {
        errors.price6 = 'Giá phải là bội số của 1.000 đ.';
    } else if (price6 > price3 * 2) {
        errors.price6 = `Gói 6 tháng nên rẻ hơn hoặc bằng 2 gói lẻ 3 tháng (${formatVND(price3 * 2)}).`;
    }

    if (price12 <= 0) {
        errors.price12 = 'Giá gói 12 tháng phải lớn hơn 0 đ.';
    } else if (price12 % 1000 !== 0) {
        errors.price12 = 'Giá phải là bội số của 1.000 đ.';
    } else if (price12 > price6 * 2) {
        errors.price12 = `Gói 12 tháng nên rẻ hơn hoặc bằng 2 gói lẻ 6 tháng (${formatVND(price6 * 2)}).`;
    }

    const hasErrors = Object.keys(errors).length > 0;

    const handleSave = () => {
        if (hasErrors) return;
        onSave({ ...item, price1Month: price1, price3Month: price3, price6Month: price6, price12Month: price12 });
    };

    const monthlyField = (label, value, setter, errorKey, icon) => (
        <div className="ap-field-group">
            <label className="ap-field-label">
                <span className="material-symbols-outlined">{icon}</span>
                {label}
            </label>
            <div className={`ap-input-wrapper ${errors[errorKey] ? 'ap-input-wrapper--error' : ''}`}>
                <input
                    className="ap-input"
                    type="number"
                    value={value}
                    min="0"
                    step="1000"
                    onChange={e => setter(parseNumber(e.target.value))}
                />
                <span className="ap-input-suffix">đ</span>
            </div>
            {errors[errorKey] ? (
                <p className="ap-error-msg">
                    <span className="material-symbols-outlined">error</span>
                    {errors[errorKey]}
                </p>
            ) : (
                <p className="ap-field-hint">Nhập số tiền tương ứng</p>
            )}
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
                        {monthlyField('Gói 1 tháng', price1, setPrice1, 'price1', 'calendar_month')}
                        {monthlyField('Gói 3 tháng', price3, setPrice3, 'price3', 'date_range')}
                        {monthlyField('Gói 6 tháng', price6, setPrice6, 'price6', 'event_available')}
                        {monthlyField('Gói 12 tháng', price12, setPrice12, 'price12', 'event_repeat')}
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
                    <button
                        className="ap-btn-save"
                        onClick={handleSave}
                        style={{ background: hasErrors ? '#cbd5e1' : item.color, cursor: hasErrors ? 'not-allowed' : 'pointer' }}
                        disabled={hasErrors}
                    >
                        <span className="material-symbols-outlined">save</span>
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
