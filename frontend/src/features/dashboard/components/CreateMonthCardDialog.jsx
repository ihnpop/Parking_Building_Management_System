import React, { useState } from 'react';

export default function CreateMonthCardDialog({
    isOpen,
    onClose,
    onSuccess
}) {
    const [formData, setFormData] = useState({
        cardType: 'Thẻ tháng',
        plate: '',
        startDate: new Date().toISOString().split('T')[0],
        duration: '1 tháng',
        price: '100.000 VNĐ',
        fullName: '',
        phone: '',
        email: '',
        status: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;

        let price = formData.price;

        if (name === 'duration') {
            switch (value) {
                case '1 tháng':
                    price = '100.000 VNĐ';
                    break;
                case '3 tháng':
                    price = '280.000 VNĐ';
                    break;
                case '6 tháng':
                    price = '550.000 VNĐ';
                    break;
                case '12 tháng':
                    price = '1.000.000 VNĐ';
                    break;
                default:
                    break;
            }
        }

        setFormData(prev => ({
            ...prev,
            [name]: value,
            price
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !formData.plate ||
            !formData.fullName ||
            !formData.phone ||
            !formData.email
        ) {
            setError('Vui lòng nhập đầy đủ thông tin.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            console.log('Create Month Card:', formData);

            setSuccessMessage('Đăng ký thẻ tháng thành công!');

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1000);

        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="renew-modal-overlay">
            <div
                className="renew-modal"
                style={{
                    maxWidth: '650px',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <div className="renew-modal-header">
                    <h2>Đăng ký thẻ mới</h2>

                    <button
                        type="button"
                        className="renew-modal-close"
                        onClick={onClose}
                    >
                        <span className="material-symbols-outlined">
                            close
                        </span>
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}
                >
                    {error && (
                        <div
                            style={{
                                color: '#ef4444',
                                background: '#fef2f2',
                                padding: '12px',
                                borderRadius: '8px'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div
                            style={{
                                color: '#10b981',
                                background: '#ecfdf5',
                                padding: '12px',
                                borderRadius: '8px'
                            }}
                        >
                            {successMessage}
                        </div>
                    )}

                    <div className="renew-form-group">
                        <label>Loại thẻ</label>
                        <select
                            name="cardType"
                            className="renew-select"
                            value={formData.cardType}
                            onChange={handleChange}
                        >
                            <option value="Thẻ tháng">
                                Thẻ tháng
                            </option>
                        </select>
                    </div>

                    <div className="renew-form-group">
                        <label>Biển số xe</label>
                        <input
                            type="text"
                            name="plate"
                            className="renew-select"
                            placeholder="Ví dụ: 30K-12345"
                            value={formData.plate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="renew-form-group">
                        <label>Ngày bắt đầu</label>
                        <input
                            type="date"
                            name="startDate"
                            className="renew-select"
                            value={formData.startDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="renew-form-group">
                        <label>Thời hạn đăng ký</label>
                        <select
                            name="duration"
                            className="renew-select"
                            value={formData.duration}
                            onChange={handleChange}
                        >
                            <option value="1 tháng">1 tháng</option>
                            <option value="3 tháng">3 tháng</option>
                            <option value="6 tháng">6 tháng</option>
                            <option value="12 tháng">12 tháng</option>
                        </select>
                    </div>

                    <div className="renew-form-group">
                        <label>Giá tiền</label>
                        <input
                            type="text"
                            className="renew-select"
                            value={formData.price}
                            readOnly
                        />
                    </div>

                    <div className="renew-form-group">
                        <label>Tên khách hàng</label>
                        <input
                            type="text"
                            name="fullName"
                            className="renew-select"
                            placeholder="Ví dụ: Nguyễn Văn A"
                            value={formData.fullName}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="renew-form-group">
                        <label>Số điện thoại</label>
                        <input
                            type="text"
                            name="phone"
                            className="renew-select"
                            placeholder="Ví dụ: 0987654321"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="renew-form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            className="renew-select"
                            placeholder="Ví dụ: vana@gmail.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="renew-form-group">
                        <label>Trạng thái</label>
                        <input
                            id="status"
                            name="status"
                            type="text"
                            className="cp-input"
                            value={formData.status}
                            readOnly
                        />
                    </div>

                    <div className="renew-modal-actions">
                        <button
                            type="button"
                            className="renew-btn secondary"
                            onClick={onClose}
                        >
                            Hủy
                        </button>

                        <button
                            type="submit"
                            className="renew-btn primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Đang xử lý...'
                                : 'Đăng ký'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
