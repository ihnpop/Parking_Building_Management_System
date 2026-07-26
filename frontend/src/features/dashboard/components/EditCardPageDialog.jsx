import { useState, useEffect } from 'react';
import { updateCard } from '../../../service/cardApi';
import { useNotification } from '../../../context/NotificationContext';
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
        let isMounted = true;

        const loadSessionAndInitForm = async () => {
            if (!isOpen || !card) return;

            let checkIn = card.check_in_time || '';
            let checkOut = card.check_out_time || '';

            try {
                const plate = card.plate && card.plate !== 'Chưa có' ? card.plate : null;
                if (plate || card.card_id) {
                    let query = supabase
                        .from('parking_sessions')
                        .select('entry_time, exit_time, status')
                        .order('entry_time', { ascending: false })
                        .limit(1);

                    if (card.card_id && plate) {
                        query = query.or(`plate_number.eq.${plate},card_id.eq.${card.card_id}`);
                    } else if (card.card_id) {
                        query = query.eq('card_id', card.card_id);
                    } else {
                        query = query.eq('plate_number', plate);
                    }

                    const { data: session } = await query.maybeSingle();

                    if (session && isMounted) {
                        checkIn = session.entry_time || '';
                        if (!session.exit_time || session.status === 'Đang gửi' || session.status === 'Đang gửi xe') {
                            checkOut = '';
                        } else {
                            checkOut = session.exit_time || '';
                        }
                    }
                }
            } catch (err) {
                console.warn("[EditCardPageDialog] Lỗi fetch session real-time:", err);
            }

            if (isMounted) {
                setFormData({
                    type: 'Thẻ lượt',
                    plate: card.plate || '',
                    checkInTime: toLocalISOString(checkIn),
                    checkOutTime: toLocalISOString(checkOut),
                    status: card.status || 'Hoạt động'
                });
                setFormError(null);
            }
        };

        loadSessionAndInitForm();

        return () => {
            isMounted = false;
        };
    }, [isOpen, card]);

    if (!isOpen || !card) return null;

    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdate = async (e) => {
        if (
            formData.checkInTime &&
            formData.checkOutTime &&
            new Date(formData.checkOutTime) < new Date(formData.checkInTime)
        ) {
            setFormError("Thời gian ra phải sau hoặc bằng thời gian vào.");
            return;
        }
        e.preventDefault();
        setFormError(null);
        const hasPlate = formData.plate && formData.plate.trim() !== '';
        try {
            setSubmitting(true);
            await updateCard(card.card_id, {
                type: 'Thẻ lượt',
                plate: formData.plate,
                checkInTime: hasPlate && formData.checkInTime ? fromLocalISOString(formData.checkInTime) : null,
                checkOutTime: hasPlate && formData.checkOutTime ? fromLocalISOString(formData.checkOutTime) : null,
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
                            className="cp-input"
                            value={formData.plate}
                            onChange={handleFormChange}
                            placeholder="Ví dụ: 30K12345"
                            pattern="\d{2}[A-Za-z]\d{4,5}"
                            onInvalid={(e) => {
                                if (e.target.validity.patternMismatch) {
                                    e.target.setCustomValidity(
                                        "Biển số xe không đúng định dạng. Ví dụ: 30K12345 hoặc 59X312345."
                                    );
                                }
                            }}
                            onInput={(e) => e.target.setCustomValidity("")}
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
