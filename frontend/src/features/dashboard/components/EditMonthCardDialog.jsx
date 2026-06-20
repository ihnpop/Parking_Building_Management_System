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
    // Lưu thông báo thành công
    const [successMessage, setSuccessMessage] = useState('');
    // Khi mở modal thì load dữ liệu vào form
    useEffect(() => {
        if (isOpen && cardData) {
            setFormData({
                plate: cardData.plate !== 'Chưa có' ? cardData.plate || '' : '',
                fullName: cardData.customer !== 'Khách vãng lai' ? cardData.customer || '' : '',
                phone: cardData.phone || '',
                email: cardData.email || '',
                status: cardData.status || 'Hoạt động',
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
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
            <div className="renew-modal" style={{ maxWidth: '600px' }}>
                <div className="renew-modal-header">
                    <h2>Cập nhật Thẻ tháng</h2>
                    <button type="button" className="renew-modal-close" onClick={onClose} disabled={isSubmitting}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {error && (
                        <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div style={{ color: '#10b981', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
                            {successMessage}
                        </div>
                    )}

                    <div className="renew-info-grid" style={{ marginBottom: '0px' }}>
                        <div className="renew-info-item">
                            <span className="renew-info-label">Số thẻ</span>
                            <span className="renew-info-value">{cardData.cardNo}</span>
                        </div>
                        <div className="renew-info-item">
                            <span className="renew-info-label">Ngày bắt đầu</span>
                            <span className="renew-info-value">{cardData.startDate}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="renew-form-group" style={{ marginBottom: '0px' }}>
                            <label htmlFor="plate">Biển số xe <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                id="plate"
                                name="plate"
                                type="text"
                                readOnly
                                className="renew-select"
                                value={formData.plate}
                                onChange={handleFormChange}
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="renew-form-group" style={{ marginBottom: '0px' }}>
                            <label htmlFor="status">Trạng thái</label>
                            <select
                                id="status"
                                name="status"
                                className="renew-select"
                                value={formData.status}
                                onChange={handleFormChange}
                                disabled={isSubmitting}
                            >
                                <option value="Hoạt động">Hoạt động</option>
                                <option value="Đang chờ">Đang chờ</option>
                                <option value="Đã khóa">Đã khóa</option>
                                <option value="Hết hạn">Hết hạn</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="renew-form-group" style={{ marginBottom: '0px' }}>
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

                        <div className="renew-form-group" style={{ marginBottom: '0px' }}>
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

                    <div className="renew-form-group" style={{ marginBottom: '0px' }}>
                        <label htmlFor="fullName">Tên khách hàng <span style={{ color: '#ef4444' }}>*</span></label>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="renew-form-group" style={{ marginBottom: '0px' }}>
                            <label htmlFor="phone">Số điện thoại <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                className="renew-select"
                                value={formData.phone}
                                onChange={handleFormChange}
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="renew-form-group" style={{ marginBottom: '0px' }}>
                            <label htmlFor="email">Email <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="renew-select"
                                value={formData.email}
                                onChange={handleFormChange}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {!hasPlate && (
                        <p style={{ color: '#f59e0b', fontSize: '13px', margin: '0' }}>
                            Thẻ chưa có biển số nên không thể cập nhật thời gian vào/ra.
                        </p>
                    )}

                    <div className="renew-modal-actions" style={{ marginTop: '8px' }}>
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
                            className="renew-btn primary"
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
