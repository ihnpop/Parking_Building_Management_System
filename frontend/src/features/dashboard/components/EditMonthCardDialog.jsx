import React, { useState, useEffect } from 'react';
import { updateMonthCard } from '../../../service/monthCardApi';
import supabase from '../../../config/supabaseClient';

// Helper: Convert UTC / ISO timestamp to local 'YYYY-MM-DDTHH:mm' for datetime-local input
const toLocalISOString = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper: Convert local 'YYYY-MM-DDTHH:mm' input value to ISO string for backend payload
const fromLocalISOString = (localISOStr) => {
    if (!localISOStr || !localISOStr.trim()) return null;
    const date = new Date(localISOStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
};

export default function EditMonthCardDialog({ isOpen, onClose, cardData, onSuccess }) {
    // Lưu dữ liệu form cập nhật thẻ tháng
    const [formData, setFormData] = useState({
        plate: '',
        fullName: '',
        phone: '',
        email: '',
        status: 'Hoạt động',
        checkInTime: '',
        checkOutTime: ''
    });
    // Trạng thái đang gửi dữ liệu lên server
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Lưu thông báo lỗi
    const [error, setError] = useState(null);
    // Lưu lỗi từng field
    const [fieldErrors, setFieldErrors] = useState({ phone: '', email: '' });
    // Lưu thông báo thành công
    const [successMessage, setSuccessMessage] = useState('');
    // Helper: convert UI label -> DB value
    const uiToDbStatus = (uiStatus) => {
        switch (uiStatus) {
            case 'Hoạt động': return 'Hoạt động';
            case 'Sắp hết hạn': return 'Đang chờ';
            case 'Hết hạn': return 'Đã khóa';
            // Nếu đã là DB value thì giữ nguyên
            default: return uiStatus;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadSessionAndInitForm = async () => {
            if (!isOpen || !cardData) return;

            let checkIn = cardData.check_in_time || '';
            let checkOut = cardData.check_out_time || '';

            try {
                const plate = cardData.plate !== 'Chưa có' ? cardData.plate : null;
                if (plate || cardData.card_id) {
                    let query = supabase
                        .from('parking_sessions')
                        .select('entry_time, exit_time, status')
                        .order('entry_time', { ascending: false })
                        .limit(1);

                    if (cardData.card_id && plate) {
                        query = query.or(`plate_number.eq.${plate},card_id.eq.${cardData.card_id}`);
                    } else if (cardData.card_id) {
                        query = query.eq('card_id', cardData.card_id);
                    } else {
                        query = query.eq('plate_number', plate);
                    }

                    const { data: session } = await query.maybeSingle();

                    if (session && isMounted) {
                        checkIn = session.entry_time || '';
                        // Xe đang ở trong bãi xe (đã checkin, chưa checkout) -> exit_time rỗng
                        if (!session.exit_time || session.status === 'Đang gửi' || session.status === 'Đang gửi xe') {
                            checkOut = '';
                        } else {
                            checkOut = session.exit_time || '';
                        }
                    }
                }
            } catch (err) {
                console.warn("[EditMonthCardDialog] Lỗi fetch session real-time:", err);
            }

            if (isMounted) {
                setFormData({
                    plate: cardData.plate !== 'Chưa có' ? cardData.plate || '' : '',
                    fullName: cardData.customer !== 'Khách vãng lai' ? cardData.customer || '' : '',
                    phone: cardData.phone || '',
                    email: cardData.email || '',
                    cccd_number: cardData.cccd_number || '',
                    status: uiToDbStatus(cardData.status || 'Hoạt động'),
                    checkInTime: toLocalISOString(checkIn),
                    checkOutTime: toLocalISOString(checkOut)
                });
                setError(null);
                setSuccessMessage('');
            }
        };

        loadSessionAndInitForm();

        return () => {
            isMounted = false;
        };
    }, [isOpen, cardData]);

    if (!isOpen || !cardData) return null;
    // Cập nhật dữ liệu khi người dùng thay đổi giá trị trong form
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Xóa lỗi field khi người dùng bắt đầu chỉnh sửa
        if (name === 'phone' || name === 'email') {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    // Kiểm tra thẻ đã được gán biển số xe hay chưa
    const hasPlate = formData.plate && formData.plate.trim() !== '';
    // Xử lý khi người dùng submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');

        if (!formData.plate || !formData.fullName || !formData.phone || !formData.email) {
            setError('Vui lòng điền đầy đủ thông tin khách hàng và biển số xe.');
            return;
        }

        // Validate số điện thoại: đúng 10 chữ số và bắt đầu bằng 0
        const phoneRegex = /^0\d{9}$/;
        // Validate email: định dạng hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const newFieldErrors = { phone: '', email: '' };
        let hasFieldError = false;

        if (!phoneRegex.test(formData.phone.trim())) {
            newFieldErrors.phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.';
            hasFieldError = true;
        }
        if (!emailRegex.test(formData.email.trim())) {
            newFieldErrors.email = 'Email/Gmail không đúng định dạng (vd: example@gmail.com).';
            hasFieldError = true;
        }

        setFieldErrors(newFieldErrors);
        if (hasFieldError) return;
        // Set trạng thái đang gửi dữ liệu
        setIsSubmitting(true);
        // Gửi dữ liệu lên server
        try {
            const payload = {
                plate: formData.plate,
                fullName: formData.fullName,
                phone: formData.phone,
                email: formData.email,
                cccd_number: formData.cccd_number,
                status: formData.status,
                checkInTime: hasPlate && formData.checkInTime ? fromLocalISOString(formData.checkInTime) : null,
                checkOutTime: hasPlate && formData.checkOutTime ? fromLocalISOString(formData.checkOutTime) : null
            };

            const res = await updateMonthCard(cardData.card_id, payload);
            if (res.success) {
                setSuccessMessage("Cập nhật thẻ tháng thành công!");
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1000);
            } else {
                setError(res.message || "Cập nhật thẻ tháng thất bại");
            }
        } catch (err) {
            console.error("Lỗi cập nhật thẻ tháng:", err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Đã xảy ra lỗi trong quá trình cập nhật.";
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="renew-modal-overlay">
            <div className="renew-modal emc-modal">
                <div className="renew-modal-header">
                    <h2>Cập nhật Thẻ tháng</h2>
                    <button type="button" className="renew-modal-close" onClick={onClose} disabled={isSubmitting}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="emc-form">
                    {error && (
                        <div className="emc-alert-error">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="emc-alert-success">
                            {successMessage}
                        </div>
                    )}

                    <div className="renew-info-grid emc-info-grid">
                        <div className="renew-info-item">
                            <span className="renew-info-label">Số thẻ</span>
                            <span className="renew-info-value">{cardData.cardNo}</span>
                        </div>
                        <div className="renew-info-item">
                            <span className="renew-info-label">Ngày bắt đầu</span>
                            <span className="renew-info-value">{cardData.startDate}</span>
                        </div>
                    </div>

                    <div className="emc-grid-2col">
                        <div className="renew-form-group emc-form-group-0">
                            <label htmlFor="plate">Biển số xe <span className="emc-required-star">*</span></label>
                            <input
                                id="plate"
                                name="plate"
                                type="text"
                                className="renew-select"
                                value={formData.plate}
                                onChange={handleFormChange}
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="renew-form-group emc-form-group-0">
                            <label htmlFor="status">Trạng thái</label>
                            <select
                                id="status"
                                name="status"
                                className="renew-select"
                                value={formData.status}
                                onChange={handleFormChange}
                                disabled={isSubmitting}
                            >
                                {/* Options dùng DB values, label hiển thị UI */}
                                <option value="Hoạt động">Hoạt động</option>
                                <option value="Đang chờ">Đang chờ</option>
                                <option value="Đã khóa">Hết hạn (Đã khóa)</option>
                            </select>
                        </div>
                    </div>

                    <div className="emc-grid-2col">
                        <div className="renew-form-group emc-form-group-0">
                            <label htmlFor="checkInTime">Thời gian vào</label>
                            <input
                                id="checkInTime"
                                name="checkInTime"
                                type="datetime-local"
                                className="renew-select"
                                value={formData.checkInTime}
                                onChange={handleFormChange}
                                disabled={isSubmitting || !hasPlate}
                            />
                        </div>

                        <div className="renew-form-group emc-form-group-0">
                            <label htmlFor="checkOutTime">Thời gian ra</label>
                            <input
                                id="checkOutTime"
                                name="checkOutTime"
                                type="datetime-local"
                                className="renew-select"
                                value={formData.checkOutTime}
                                onChange={handleFormChange}
                                disabled={isSubmitting || !hasPlate}
                            />
                        </div>
                    </div>

                    <div className="renew-form-group emc-form-group-0">
                        <label htmlFor="fullName">Tên khách hàng <span className="emc-required-star">*</span></label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            className="renew-select"
                            value={formData.fullName}
                            onChange={handleFormChange}
                            required
                            disabled={true}
                            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                    </div>

                    <div className="emc-grid-2col">
                        <div className="renew-form-group emc-form-group-0">
                            <label htmlFor="phone">Số điện thoại <span className="emc-required-star">*</span></label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                className={`renew-select${fieldErrors.phone ? ' emc-input-error' : ''}`}
                                value={formData.phone}
                                onChange={handleFormChange}
                                required
                                disabled={isSubmitting}
                            />
                            {fieldErrors.phone && (
                                <span className="emc-field-error-msg">
                                    {fieldErrors.phone}
                                </span>
                            )}
                        </div>

                        <div className="renew-form-group emc-form-group-0">
                            <label htmlFor="email">Email / Gmail <span className="emc-required-star">*</span></label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                className={`renew-select${fieldErrors.email ? ' emc-input-error' : ''}`}
                                value={formData.email}
                                onChange={handleFormChange}
                                required
                                disabled={isSubmitting}
                            />
                            {fieldErrors.email && (
                                <span className="emc-field-error-msg">
                                    {fieldErrors.email}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="renew-form-group emc-form-group-0">
                        <label htmlFor="cccd_number">Số CCCD/CMND <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>(dùng cho hợp đồng)</span></label>
                        <input
                            id="cccd_number"
                            name="cccd_number"
                            type="text"
                            className="renew-select"
                            value={formData.cccd_number || ''}
                            onChange={handleFormChange}
                            maxLength={12}
                            placeholder="079xxxxxxxxxxxxx"
                            disabled={true}
                            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                    </div>

                    {!hasPlate && (
                        <p className="emc-hint-no-plate">
                            Thẻ chưa có biển số nên không thể cập nhật thời gian vào/ra.
                        </p>
                    )}

                    <div className="renew-modal-actions emc-modal-actions">
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
                            className="cp-btn cp-btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Xác nhận cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}