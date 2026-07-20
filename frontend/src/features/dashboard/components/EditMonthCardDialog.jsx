import React, { useState, useEffect } from 'react';
import { updateMonthCard } from '../../../service/monthCardApi';

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
    // Khi mở modal thì load dữ liệu vào form
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
        if (isOpen && cardData) {
            setFormData({
                plate: cardData.plate !== 'Chưa có' ? cardData.plate || '' : '',
                fullName: cardData.customer !== 'Khách vãng lai' ? cardData.customer || '' : '',
                phone: cardData.phone || '',
                email: cardData.email || '',
                status: uiToDbStatus(cardData.status || 'Hoạt động'),
                checkInTime: cardData.check_in_time
                    ? new Date(cardData.check_in_time).toISOString().slice(0, 16)
                    : '',
                checkOutTime: cardData.check_out_time
                    ? new Date(cardData.check_out_time).toISOString().slice(0, 16)
                    : ''
            });
            setError(null);
            setSuccessMessage('');
        }
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
                status: formData.status,
                checkInTime: hasPlate ? formData.checkInTime : null,
                checkOutTime: hasPlate ? formData.checkOutTime : null
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
                            disabled={isSubmitting}
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