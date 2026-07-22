import React, { useState, useEffect } from 'react';

export default function EditUserDialog({
    isOpen,
    onClose,
    editingUser,
    setEditingUser,
    handleSaveEdit
}) {
    const [errors, setErrors] = useState({});

    // Reset lỗi mỗi khi mở lại dialog
    useEffect(() => {
        if (isOpen) setErrors({});
    }, [isOpen]);

    if (!isOpen || !editingUser) return null;

    const validate = () => {
        const newErrors = {};

        if (!editingUser.name.trim()) {
            newErrors.name = 'Vui lòng nhập họ và tên.';
        }

        if (!editingUser.email.trim()) {
            newErrors.email = 'Vui lòng nhập địa chỉ email.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email.trim())) {
            newErrors.email = 'Email không đúng định dạng.';
        }

        if (!editingUser.phone || !editingUser.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại.';
        } else if (!/^0\d{9}$/.test(editingUser.phone.trim())) {
            newErrors.phone = 'Số điện thoại phải độ dài 10 số và bắt đầu bằng 0.';
        }

        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        handleSaveEdit(e);
    };

    const clearError = (field) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    return (
        <div className="user-management-modal-overlay" onClick={onClose}>
            <div className="user-management-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="user-modal-header">
                    <h3>Cập nhật thành viên</h3>
                    <button type="button" className="modal-close-x-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="user-modal-form-body">
                    {/* Họ và tên */}
                    <div className="user-modal-input-group">
                        <label>Họ và tên người dùng <span className="required-star">*</span></label>
                        <input
                            type="text"
                            value={editingUser.name}
                            onChange={(e) => { setEditingUser(prev => ({ ...prev, name: e.target.value })); clearError('name'); }}
                            className={errors.name ? 'cp-input-error' : ''}
                        />
                        {errors.name && <p className="cp-error-text">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="user-modal-input-group">
                        <label>Địa chỉ Email <span className="required-star">*</span></label>
                        <input
                            type="email"
                            value={editingUser.email}
                            onChange={(e) => { setEditingUser(prev => ({ ...prev, email: e.target.value })); clearError('email'); }}
                            className={errors.email ? 'cp-input-error' : ''}
                        />
                        {errors.email && <p className="cp-error-text">{errors.email}</p>}
                    </div>

                    {/* Số điện thoại */}
                    <div className="user-modal-input-group">
                        <label>Số điện thoại <span className="required-star">*</span></label>
                        <input
                            type="text"
                            placeholder="Nhập số điện thoại..."
                            value={editingUser.phone || ''}
                            onChange={(e) => { setEditingUser(prev => ({ ...prev, phone: e.target.value })); clearError('phone'); }}
                            className={errors.phone ? 'cp-input-error' : ''}
                        />
                        {errors.phone && <p className="cp-error-text">{errors.phone}</p>}
                    </div>

                    {/* Vai trò */}
                    <div className="user-modal-input-group">
                        <label>Phân quyền vai trò (Role)</label>
                        <div className="modal-select-styled-wrapper">
                            <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                            >
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="Staff">Staff</option>
                            </select>
                        </div>
                    </div>

                    {/* Trạng thái */}
                    <div className="user-modal-input-group">
                        <label>Trạng thái tài khoản</label>
                        <div className="modal-select-styled-wrapper">
                            <select
                                value={editingUser.status}
                                onChange={(e) => setEditingUser(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="Hoạt động">Hoạt động</option>
                                <option value="Không hoạt động">Không hoạt động</option>
                            </select>
                        </div>
                    </div>

                    <div className="user-modal-footer-actions">
                        <button type="button" className="user-modal-btn cancel" onClick={onClose}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="user-modal-btn submit">
                            Xác nhận lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
