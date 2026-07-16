import { useState, useEffect } from 'react';
import { updateCard } from '../../../service/cardApi';
import { useNotification } from '../../../context/NotificationContext';

// ─────────────────────────────────────────────
// Modal: Cập nhật thẻ
// ─────────────────────────────────────────────
export default function EditCardPageDialog({ isOpen, onClose, onSuccess, card }) {
    const { showToast } = useNotification();
    const [formData, setFormData] = useState({
        type: 'Thẻ lượt',
        plate: '',
        checkInTime: '',
        checkOutTime: '',
        status: 'Hoạt động'
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (isOpen && card) {
            setFormData({
                type: 'Thẻ lượt',
                plate: card.plate || '',
                checkInTime: card.check_in_time
                    ? new Date(card.check_in_time).toISOString().slice(0, 16)
                    : '',
                checkOutTime: card.check_out_time
                    ? new Date(card.check_out_time).toISOString().slice(0, 16)
                    : '',
                status: card.status || 'Hoạt động'
            });
            setFormError(null);
        }
    }, [isOpen, card]);

    if (!isOpen || !card) return null;

    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setFormError(null);
        const hasPlate = formData.plate && formData.plate.trim() !== '';
        try {
            setSubmitting(true);
            await updateCard(card.card_id, {
                type: 'Thẻ lượt',
                plate: formData.plate,
                checkInTime: hasPlate ? formData.checkInTime : null,
                checkOutTime: hasPlate ? formData.checkOutTime : null,
                status: hasPlate ? formData.status : card.status
            });
            showToast("Cập nhật thẻ thành công", "success");
            onSuccess?.();
        } catch (err) {
            setFormError(err?.response?.data?.message || err?.response?.data?.error || err.message || 'Lỗi khi cập nhật thẻ.');
        } finally {
            setSubmitting(false);
        }
    };

    const hasPlate = formData.plate && formData.plate.trim() !== '';

    return (
        <div className="cp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cp-modal">
                <div className="cp-modal-header">
                    <h2>Cập nhật thẻ</h2>
                    <button type="button" className="cp-modal-close" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form className="cp-modal-form" onSubmit={handleUpdate}>
                    <div className="cp-form-group">
                        <label htmlFor="plate">Biển số xe</label>
                        <input
                            id="plate"
                            name="plate"
                            type="text"
                            placeholder="Ví dụ: 59G112345 (Nếu có)"
                            className="cp-input"
                            value={formData.plate}
                            onChange={handleFormChange}
                        />
                    </div>

                    <div className="cp-form-group">
                        <label>Thời gian vào</label>
                        <input
                            type="datetime-local"
                            name="checkInTime"
                            value={formData.checkInTime}
                            onChange={handleFormChange}
                            className="cp-input"
                            disabled={!hasPlate}
                        />
                    </div>

                    <div className="cp-form-group">
                        <label>Thời gian ra</label>
                        <input
                            type="datetime-local"
                            name="checkOutTime"
                            value={formData.checkOutTime}
                            onChange={handleFormChange}
                            className="cp-input"
                            disabled={!hasPlate}
                        />
                    </div>

                    <div className="cp-form-group">
                        <label>Trạng thái</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleFormChange}
                            className="cp-select"
                            disabled={!hasPlate}
                        >
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Đang chờ">Đang chờ</option>
                            <option value="Đã khóa">Đã khóa</option>
                            <option value="Hết hạn">Hết hạn</option>
                        </select>
                    </div>

                    {formError && <p className="cp-form-error">{formError}</p>}

                    {!hasPlate && (
                        <p style={{ color: '#f59e0b', fontSize: '14px', marginTop: '8px' }}>
                            Thẻ chưa có biển số nên không thể chỉnh sửa thời gian vào, thời gian ra và trạng thái.
                        </p>
                    )}

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
                            {submitting ? 'Đang lưu...' : 'Cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
