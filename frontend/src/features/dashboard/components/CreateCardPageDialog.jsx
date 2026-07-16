import { useState, useEffect } from 'react';
import { createCard } from '../../../service/cardApi';
import { getVNDateTimeLocal } from '../../../utils/dateUtils';
import { useNotification } from '../../../context/NotificationContext';

const INITIAL_FORM = {
    type: 'Thẻ lượt',
    plate: '',
    startDate: '',
    status: 'Hoạt động'
};

// ─────────────────────────────────────────────
// Modal: Tạo thẻ mới
// ─────────────────────────────────────────────
export default function CreateCardPageDialog({ isOpen, onClose, onSuccess }) {
    const { showToast } = useNotification();
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                type: 'Thẻ lượt',
                plate: '',
                startDate: getVNDateTimeLocal(),
                status: 'Hoạt động'
            });
            setFormError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError(null);

        // Kiểm tra định dạng biển số xe
        if (formData.plate && formData.plate.trim() !== '') {
            const rawPlate = formData.plate.replace(/[\s.\-]/g, '').toUpperCase();
            const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
            if (!plateRegex.test(rawPlate)) {
                setFormError('Biển số xe không đúng định dạng. Vui lòng nhập theo định dạng xx[A-Z]xxxx hoặc xx[A-Z]xxxxx (Ví dụ: 30K12345 hoặc 59X312345).');
                return;
            }
        }

        try {
            setSubmitting(true);
            await createCard({
                type: 'Thẻ lượt',
                startDate: formData.startDate,
                plate: formData.plate.trim() || undefined
            });
            showToast("Đăng ký thẻ mới thành công", "success");
            onSuccess?.();
        } catch (err) {
            setFormError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Lỗi khi tạo thẻ.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="cp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cp-modal">
                <div className="cp-modal-header">
                    <h2>Đăng ký thẻ mới</h2>
                    <button type="button" className="cp-modal-close" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form className="cp-modal-form" onSubmit={handleCreate}>
                    {/* Loại thẻ mặc định là Thẻ lượt — không hiển thị dropdown vì form này chỉ dùng cho Thẻ lượt */}


                    {/* 2. Biển số xe */}
                    <div className="cp-form-group">
                        <label htmlFor="plate">Biển số xe</label>
                        <input
                            id="plate"
                            name="plate"
                            type="text"
                            placeholder="Ví dụ: 30K12345"
                            className="cp-input"
                            value={formData.plate}
                            onChange={handleFormChange}
                        />
                    </div>

                    {/* 3. Ngày bắt đầu */}
                    <div className="cp-form-group">
                        <label htmlFor="startDate">Ngày bắt đầu</label>
                        <input
                            id="startDate"
                            name="startDate"
                            type="datetime-local"
                            className="cp-input"
                            value={formData.startDate}
                            onChange={handleFormChange}
                        />
                    </div>

                    {/* 4. Trạng thái — readonly, luôn là "Hoạt động" khi tạo mới */}
                    <div className="cp-form-group">
                        <label htmlFor="status">Trạng thái</label>
                        <input
                            id="status"
                            name="status"
                            type="text"
                            className="cp-input"
                            value={formData.status}
                            readOnly
                        />
                    </div>

                    {formError && <p className="cp-form-error">{formError}</p>}

                    <div className="cp-modal-actions">
                        <button
                            type="button"
                            className="cp-btn cp-btn-outline"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="cp-btn cp-btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Đang lưu...' : 'Đăng ký'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
