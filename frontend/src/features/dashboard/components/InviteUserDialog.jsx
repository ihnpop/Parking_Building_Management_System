import React, { useState, useEffect } from 'react';
import "./InviteUserDialog.css";

export default function InviteUserDialog({
    isOpen,
    onClose,
    inviteData,
    setInviteData,
    roles,
    buildings,
    handleInviteSubmit,
    isLoading
}) {
    const [errors, setErrors] = useState({});

    // Reset lỗi mỗi khi mở lại dialog
    useEffect(() => {
        if (isOpen) setErrors({});
    }, [isOpen]);

    if (!isOpen) return null;

    const validate = () => {
        const newErrors = {};

        if (!inviteData.full_name.trim()) {
            newErrors.full_name = 'Vui lòng nhập họ và tên.';
        }

        if (!inviteData.username.trim()) {
            newErrors.username = 'Vui lòng nhập tên đăng nhập.';
        } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(inviteData.username.trim())) {
            newErrors.username = 'Tên đăng nhập chỉ gồm chữ, số, dấu gạch dưới (3–30 ký tự).';
        }

        if (!inviteData.email.trim()) {
            newErrors.email = 'Vui lòng nhập địa chỉ email.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteData.email.trim())) {
            newErrors.email = 'Email không đúng định dạng.';
        }

        if (!inviteData.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại.';
        } else if (!/^0\d{9}$/.test(inviteData.phone.trim())) {
            newErrors.phone = 'Số điện thoại phải độ dài 10 số và bắt đầu bằng 0.';
        }

        if (!inviteData.role_id) {
            newErrors.role_id = 'Vui lòng chọn vai trò.';
        }

        if (!inviteData.building_id) {
            newErrors.building_id = 'Vui lòng chọn tòa nhà.';
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
        handleInviteSubmit(e);
    };

    const clearError = (field) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    return (
        <div className="user-management-modal-overlay" onClick={onClose}>
            <div className="user-management-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="user-modal-header">
                    <h3>Thêm nhân viên mới</h3>
                    <button type="button" className="modal-close-x-btn" onClick={onClose}>
                        <span className="material-symbols-outlined ump-close-icon-nopad">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="user-modal-form-body">
                    {/* Họ và tên */}
                    <div className="user-modal-input-group">
                        <label>Họ và tên <span className="required-star">*</span></label>
                        <input
                            type="text"
                            placeholder="Nhập họ và tên..."
                            value={inviteData.full_name}
                            onChange={(e) => { setInviteData(prev => ({ ...prev, full_name: e.target.value })); clearError('full_name'); }}
                            className={errors.full_name ? 'cp-input-error' : ''}
                        />
                        {errors.full_name && <p className="cp-error-text">{errors.full_name}</p>}
                    </div>

                    {/* Username */}
                    <div className="user-modal-input-group">
                        <label>Tên đăng nhập (Username) <span className="required-star">*</span></label>
                        <input
                            type="text"
                            placeholder="Nhập tên đăng nhập..."
                            value={inviteData.username}
                            onChange={(e) => { setInviteData(prev => ({ ...prev, username: e.target.value })); clearError('username'); }}
                            className={errors.username ? 'cp-input-error' : ''}
                        />
                        {errors.username && <p className="cp-error-text">{errors.username}</p>}
                    </div>

                    {/* Email */}
                    <div className="user-modal-input-group">
                        <label>Địa chỉ Email <span className="required-star">*</span></label>
                        <input
                            type="email"
                            placeholder="Nhập email để gửi mã mời..."
                            value={inviteData.email}
                            onChange={(e) => { setInviteData(prev => ({ ...prev, email: e.target.value })); clearError('email'); }}
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
                            value={inviteData.phone}
                            onChange={(e) => { setInviteData(prev => ({ ...prev, phone: e.target.value })); clearError('phone'); }}
                            className={errors.phone ? 'cp-input-error' : ''}
                        />
                        {errors.phone && <p className="cp-error-text">{errors.phone}</p>}
                    </div>

                    {/* Vai trò */}
                    <div className="user-modal-input-group">
                        <label>Vai trò (Role) <span className="required-star">*</span></label>
                        <div className="modal-select-styled-wrapper">
                            <select
                                value={inviteData.role_id}
                                onChange={(e) => { setInviteData(prev => ({ ...prev, role_id: e.target.value })); clearError('role_id'); }}
                                className={errors.role_id ? 'cp-input-error' : ''}
                            >
                                <option value="" disabled>-- Chọn vai trò --</option>
                                {roles.map(r => (
                                    <option key={r.role_id} value={r.role_id}>
                                        {r.role_name} ({r.description || ''})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {errors.role_id && <p className="cp-error-text">{errors.role_id}</p>}
                    </div>

                    {/* Tòa nhà */}
                    <div className="user-modal-input-group">
                        <label>Tòa nhà trực thuộc (Building) <span className="required-star">*</span></label>
                        <div className="modal-select-styled-wrapper">
                            <select
                                value={inviteData.building_id}
                                onChange={(e) => { setInviteData(prev => ({ ...prev, building_id: e.target.value })); clearError('building_id'); }}
                                className={errors.building_id ? 'cp-input-error' : ''}
                            >
                                <option value="" disabled>-- Chọn tòa nhà --</option>
                                {buildings.map(b => (
                                    <option key={b.building_id} value={b.building_id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {errors.building_id && <p className="cp-error-text">{errors.building_id}</p>}
                    </div>

                    <div className="user-modal-footer-actions">
                        <button type="button" className="user-modal-btn cancel" onClick={onClose} disabled={isLoading}>
                            Hủy bỏ
                        </button>
                        <button type="submit" className="user-modal-btn submit" disabled={isLoading}>
                            {isLoading ? 'Đang gửi lời mời...' : 'Gửi lời mời'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
