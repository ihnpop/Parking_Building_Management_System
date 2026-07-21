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

export function EditSessionPriceModal({ item, saving = false, onClose, onSave }) {
    const [timeSlots, setTimeSlots] = useState(() => {
        if (item.timeSlots && item.timeSlots.length > 0) {
            return item.timeSlots;
        }
        return [
            { min: 0, max: 1, price: item.firstHour ?? 5000 }
        ];
    });


    const addSlot = () => {
        const last = timeSlots[timeSlots.length - 1];
        setTimeSlots([...timeSlots, { min: last?.max ?? 6, max: 24, price: 0 }]);
    };

    const removeSlot = (idx) => {
        if (timeSlots.length <= 1) return;
        setTimeSlots(timeSlots.filter((_, i) => i !== idx));
    };

    const updateSlot = (idx, field, raw) => {
        let val;
        if (field === 'min' || field === 'max') {
            if (raw === '' || raw === undefined) {
                val = '';
            } else {
                const parsed = parseFloat(raw);
                val = isNaN(parsed) ? 0 : Math.max(0, Math.min(24, parsed));
            }
        } else {
            // price — no upper limit clamp
            val = parseNumber(String(raw));
        }
        setTimeSlots(timeSlots.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };

    // Detect overlapping slots
    const overlapIndices = new Set();
    for (let i = 0; i < timeSlots.length; i++) {
        for (let j = i + 1; j < timeSlots.length; j++) {
            const a = timeSlots[i], b = timeSlots[j];
            const minA = Number(a.min) || 0, maxA = Number(a.max) || 0;
            const minB = Number(b.min) || 0, maxB = Number(b.max) || 0;
            if (minA < maxB && minB < maxA) {
                overlapIndices.add(i);
                overlapIndices.add(j);
            }
        }
    }

    // Detect slots where min >= max (invalid range)
    const invalidRangeIndices = new Set(
        timeSlots.map((s, i) => (Number(s.min) || 0) >= (Number(s.max) || 0) ? i : -1).filter(i => i >= 0)
    );


    const hasPriceErrors = timeSlots.some(s => s.price < 0 || s.price % 1000 !== 0);
    const hasOverlap = overlapIndices.size > 0;
    const hasInvalidRange = invalidRangeIndices.size > 0;
    const hasErrors = hasPriceErrors || hasOverlap || hasInvalidRange;

    const handleSave = () => {
        if (hasErrors) return;
        const firstSlotPrice = timeSlots[0]?.price ?? item.firstHour;
        const secondSlotPrice = timeSlots[1]?.price ?? item.extraHour;
        const calculatedDayMax = timeSlots.reduce((sum, s) => sum + s.price, 0);
        onSave({
            ...item,
            timeSlots,
            firstHour: firstSlotPrice,
            extraHour: secondSlotPrice || firstSlotPrice,
            dayMax: calculatedDayMax
        });
    };


    const cellLabelStyle = {
        padding: '0 8px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    };

    const hourInputStyle = {
        width: '100%',
        padding: '7px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: '7px',
        fontSize: '14px',
        fontFamily: 'inherit',
        outline: 'none',
        color: '#334155',
        boxSizing: 'border-box',
        textAlign: 'center',
        transition: 'border-color 0.15s',
    };

    const getRowBg = (idx) => {
        if (overlapIndices.has(idx) || invalidRangeIndices.has(idx)) return '#fff5f5';
        return idx % 2 === 0 ? '#fff' : '#fafbfc';
    };

    return (
        <div className="ap-modal-overlay" onClick={onClose}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                {/* ── Header ── */}
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
                    {/* ── Time Range Box ── */}
                    <div style={{
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '10px',
                        background: '#fff',
                    }}>
                        {/* Column headers */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1.2fr 32px',
                            padding: '9px 14px 8px',
                            borderBottom: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            borderRadius: '10px 10px 0 0',
                            gap: '8px',
                        }}>
                            <span style={cellLabelStyle}>Min (giờ)</span>
                            <span style={cellLabelStyle}>Max (giờ)</span>
                            <span style={cellLabelStyle}>Price</span>
                            <span />
                        </div>

                        {/* Slot rows — scrollable */}
                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {timeSlots.map((slot, idx) => (
                                <div key={idx} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1.2fr 32px',
                                    alignItems: 'center',
                                    background: getRowBg(idx),
                                    padding: '10px 14px',
                                    borderBottom: idx < timeSlots.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    gap: '8px',
                                }}>
                                    {/* Min hour */}
                                    <input
                                        type="number"
                                        value={slot.min}
                                        min="0"
                                        max="24"
                                        step="any"
                                        onChange={e => updateSlot(idx, 'min', e.target.value)}
                                        style={{
                                            ...hourInputStyle,
                                            borderColor: invalidRangeIndices.has(idx) || overlapIndices.has(idx) ? '#f87171' : '#e2e8f0',
                                        }}
                                    />
                                    {/* Max hour */}
                                    <input
                                        type="number"
                                        value={slot.max}
                                        min="0"
                                        max="24"
                                        step="any"
                                        onChange={e => updateSlot(idx, 'max', e.target.value)}
                                        style={{
                                            ...hourInputStyle,
                                            borderColor: invalidRangeIndices.has(idx) || overlapIndices.has(idx) ? '#f87171' : '#e2e8f0',
                                        }}
                                    />

                                    {/* Price */}
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={slot.price}
                                            min="0"
                                            step="1000"
                                            placeholder="0"
                                            onChange={e => updateSlot(idx, 'price', e.target.value * 1)}
                                            style={{
                                                ...hourInputStyle,
                                                padding: '7px 26px 7px 8px',
                                                textAlign: 'left',
                                                borderColor: slot.price < 0 || slot.price % 1000 !== 0 ? '#f87171' : '#e2e8f0',
                                            }}
                                        />
                                        <span style={{
                                            position: 'absolute', right: '8px', top: '50%',
                                            transform: 'translateY(-50%)', fontSize: '12px',
                                            color: '#94a3b8', pointerEvents: 'none',
                                        }}>đ</span>
                                    </div>
                                    {/* Delete button */}
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(idx)}
                                        disabled={timeSlots.length <= 1}
                                        title="Xóa khung giờ"
                                        style={{
                                            width: '28px', height: '28px', border: 'none',
                                            borderRadius: '6px',
                                            background: timeSlots.length <= 1 ? '#f1f5f9' : '#fef2f2',
                                            color: timeSlots.length <= 1 ? '#cbd5e1' : '#ef4444',
                                            cursor: timeSlots.length <= 1 ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, flexShrink: 0, transition: 'all 0.15s',
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Add slot button ── */}
                    <button
                        type="button"
                        onClick={addSlot}
                        style={{
                            width: '100%', padding: '9px 14px',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '8px', background: '#f8fafc', color: '#475569',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            fontFamily: 'inherit', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.color = item.color; e.currentTarget.style.background = `${item.color}08`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f8fafc'; }}
                    >
                        <span className="material-symbols-outlined">add</span>
                        Thêm khung giờ
                    </button>

                    {/* ── Preview ── */}
                    <div className="ap-price-preview">
                        <div className="ap-preview-label">XEM TRƯỚC</div>
                        <div style={{ maxHeight: '90px', overflowY: 'auto', paddingRight: '4px' }}>
                            {timeSlots.map((slot, idx) => (
                                <div className="ap-preview-row" key={idx}>
                                    <span>Khung {idx + 1} ({slot.min}h – {slot.max}h):</span>
                                    <strong style={{ color: item.color }}>{formatVND(slot.price)}</strong>
                                </div>
                            ))}
                        </div>
                        <div className="ap-preview-row" style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                            <span>Tổng tối đa/ngày:</span>
                            <strong style={{ color: item.color }}>{formatVND(timeSlots.reduce((sum, s) => sum + s.price, 0))}</strong>
                        </div>
                        {hasPriceErrors && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                                Tất cả mức giá phải lớn hơn hoặc bằng 0 đ và là bội số của 1.000 đ.
                            </p>
                        )}

                        {hasInvalidRange && (
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                                Min phải nhỏ hơn Max.
                            </p>
                        )}
                        {hasOverlap && (
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                                Các khung giờ bị trùng nhau. Vui lòng điều chỉnh lại.
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="ap-modal-footer">
                    <button className="ap-btn-cancel" onClick={onClose} disabled={saving}>Hủy bỏ</button>
                    <button
                        className="ap-btn-save"
                        onClick={handleSave}
                        style={{ background: (hasErrors || saving) ? '#cbd5e1' : item.color, cursor: (hasErrors || saving) ? 'not-allowed' : 'pointer' }}
                        disabled={hasErrors || saving}
                    >
                        <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'save'}</span>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}


export function EditMonthlyPriceModal({ item, saving = false, onClose, onSave }) {
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
                    <button className="ap-btn-cancel" onClick={onClose} disabled={saving}>Hủy bỏ</button>
                    <button
                        className="ap-btn-save"
                        onClick={handleSave}
                        style={{ background: (hasErrors || saving) ? '#cbd5e1' : item.color, cursor: (hasErrors || saving) ? 'not-allowed' : 'pointer' }}
                        disabled={hasErrors || saving}
                    >
                        <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'save'}</span>
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
