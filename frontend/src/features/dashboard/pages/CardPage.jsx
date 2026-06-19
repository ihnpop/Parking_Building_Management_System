import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getCards,
    createCard,
    deleteCard,
    updateCard
} from '../../../service/cardApi';
import { useAuth } from '../../../context/AuthContext';


/**
 * CardPage displays a centralized card management workspace.
 * Fetching data dynamically from Supabase via backend API.
 */

const INITIAL_FORM = {
    type: 'Thẻ tháng',
    plate: '',
    fullName: '',
    phone: '',
    email: '',
    durationMonths: '1',
    // startDate: new Date().toISOString().split('T')[0],

    checkInTime: '',
    checkOutTime: '',
    status: 'Hoạt động'
};

export default function CardPage() {
    const navigate = useNavigate();
    const { userRole, user } = useAuth();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    // Toast state
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    //Handle Edit  Card
    const handleEdit = (card) => {

        setEditingCard(card);

        setFormData({
            type: card.type || '',
            plate: card.plate || '',
            fullName: card.fullName || '',
            phone: card.phone || '',
            email: card.email || '',
            durationMonths: card.durationMonths || '1',
            // startDate: card.startDate?.split('T')[0] || '',

            checkInTime: card.check_in_time
                ? new Date(card.check_in_time)
                    .toISOString()
                    .slice(0, 16)
                : '',
            checkOutTime: card.check_out_time
                ? new Date(card.check_out_time)
                    .toISOString()
                    .slice(0, 16)
                : '',
            status: card.status || 'Hoạt động'
        });

        setShowModal(true);
    };

    const [editingCard, setEditingCard] = useState(null);

    // Handle Delete Card
    const handleDelete = async (row) => {
        if (!window.confirm("Bạn có chắc muốn xóa thẻ này không?")) {
            return;
        }
        try {
            const res = await deleteCard(row.card_id, user?.id);
            if (res.success) {
                showToast(res.message || "Card deleted successfully", "success");
                await fetchCards();
            } else {
                showToast(res.message || "Xóa thẻ thất bại", "error");
            }
        } catch (err) {
            console.error("Error deleting card:", err);
            const errMsg = err.response?.data?.message || err.message || "Xóa thẻ thất bại";
            showToast(errMsg, "error");
        }
    };

    const role = userRole ? userRole.toUpperCase() : 'STAFF';
    const getRoleLabel = (r) => {
        switch (r) {
            case 'ADMIN': return 'Admin';
            case 'MANAGER': return 'Manager';
            case 'STAFF': return 'Staff';
            default: return r;
        }
    };

    // Filters
    const [typeFilter, setTypeFilter] = useState('Tất cả loại thẻ');
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

    const fetchCards = async () => {
        try {
            setLoading(true);
            const data = await getCards();
            setCards(data);
            setError(null);
        } catch (err) {
            console.error("Error loading cards:", err);
            setError("Không thể tải danh sách thẻ. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCards();
    }, []);

    // Reset filters
    const handleResetFilters = () => {
        setTypeFilter('Tất cả loại thẻ');
        setStatusFilter('Tất cả trạng thái');
    };

    // Filter logic
    const filteredCards = cards.filter(card => {
        const matchesType = typeFilter === 'Tất cả loại thẻ' || card.type === typeFilter;
        const matchesStatus = statusFilter === 'Tất cả trạng thái' || card.status === statusFilter;
        return matchesType && matchesStatus;
    });

    // Stats
    const totalCards = cards.length;
    const activeCards = cards.filter(c => c.status === 'Hoạt động').length;
    const pendingCards = cards.filter(c => c.status === 'Đang chờ').length;
    const expiredCards = cards.filter(c => c.status === 'Hết hạn').length;
    const deletedCards = cards.filter(c => c.status === 'Đã xóa').length;

    const summaryItems = [
        { label: 'TỔNG SỐ THẺ', value: totalCards, note: 'Tất cả các thẻ đang quản lý' },
        { label: 'ĐANG HOẠT ĐỘNG', value: activeCards, note: 'Thẻ hiện đang sử dụng được' },
        { label: 'ĐANG CHỜ', value: pendingCards, note: 'Thẻ chưa được kích hoạt' },
        { label: 'HẾT HẠN', value: expiredCards, note: 'Thẻ đã quá hạn sử dụng' },
    ];

    // Open modal
    const handleCreateCard = () => {
        setEditingCard(null);

        setFormData(INITIAL_FORM);

        setFormError(null);

        setShowModal(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setFormError(null);
        setEditingCard(null);
    };

    // Handle form field change
    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Submit create card
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        // if (!formData.startDate) {
        //     setFormError('Vui lòng chọn ngày bắt đầu.');
        //     return;
        // }

        if (formData.type === 'Thẻ tháng') {
            if (!formData.plate || !formData.fullName || !formData.phone || !formData.email) {
                setFormError('Vui lòng điền đầy đủ thông tin khách hàng và biển số xe cho Thẻ tháng.');
                return;
            }
        }

        try {
            setSubmitting(true);
            if (editingCard) {

                await updateCard(
                    editingCard.card_id,
                    {
                        type: formData.type,
                        plate: formData.plate,
                        fullName: formData.fullName,
                        phone: formData.phone,
                        email: formData.email,
                        durationMonths: formData.durationMonths,

                        checkInTime: hasPlate
                            ? formData.checkInTime
                            : null,

                        checkOutTime: hasPlate
                            ? formData.checkOutTime
                            : null,

                        status: hasPlate
                            ? formData.status
                            : editingCard.status
                    }
                );

                showToast("Cập nhật thẻ thành công");

            } else {
                await createCard({
                    type: formData.type,
                    startDate: formData.startDate,
                    plate: formData.plate || undefined,
                    fullName: formData.type === 'Thẻ tháng' ? formData.fullName : undefined,
                    phone: formData.type === 'Thẻ tháng' ? formData.phone : undefined,
                    email: formData.type === 'Thẻ tháng' ? formData.email : undefined,
                    durationMonths: formData.type === 'Thẻ tháng' ? formData.durationMonths : undefined,
                });
                showToast("Tạo thẻ thành công");
            }
            setShowModal(false);
            setEditingCard(null);
            await fetchCards();
        } catch (err) {
            console.error('Error creating card:', err);
            setFormError(err?.response?.data?.error || err.message || 'Lỗi khi tạo thẻ.');
        } finally {
            setSubmitting(false);
        }
    };
    const hasPlate =
        formData.plate &&
        formData.plate.trim() !== '';
    return (
        <main className="card-page">
            <header className="cardpage-header">
                <div className="cardpage-header-left">
                    <button type="button" className="cardpage-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Trở về Dashboard
                    </button>

                    <div className="cardpage-page-title">
                        <h1>Quản lý Thẻ</h1>
                    </div>
                </div>

                <div className="cardpage-user-badge">{getRoleLabel(role)}</div>
            </header>

            <section className="cardpage-summary-grid">
                {summaryItems.map((item) => (
                    <article key={item.label} className="cardpage-summary-card">
                        <p className="summary-label">{item.label}</p>
                        <p className="summary-value">{loading ? '...' : item.value}</p>
                        <p className="summary-note">{item.note}</p>
                    </article>
                ))}
            </section>

            <section className="cardpage-toolbar">
                <div className="cardpage-filters">
                    <div className="cardpage-filter-group">
                        <label>Loại thẻ</label>
                        <select
                            className="cardpage-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="Tất cả loại thẻ">Tất cả loại thẻ</option>
                            <option value="Thẻ tháng">Thẻ tháng</option>
                            <option value="Thẻ lượt">Thẻ lượt</option>
                        </select>
                    </div>

                    <div className="cardpage-filter-group">
                        <label>Trạng thái</label>
                        <select
                            className="cardpage-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Đang chờ">Đang chờ</option>
                            <option value="Đã xóa">Đã xóa</option>
                            <option value="Hết hạn">Hết hạn</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        className="cardpage-button secondary"
                        onClick={handleResetFilters}
                    >
                        Làm mới bộ lọc
                    </button>
                </div>

                <div className="cardpage-actions">
                    <button type="button" className="cardpage-button outline" onClick={fetchCards}>
                        Tải lại dữ liệu
                    </button>
                    <button type="button" className="cardpage-button primary" onClick={handleCreateCard}>
                        + Đăng ký thẻ mới
                    </button>
                </div>
            </section>

            <section className="cardpage-table-card">
                <div className="cardpage-table-header">
                    <h2>Danh sách thẻ</h2>
                    <p>Quản lý thông tin thẻ, loại thẻ, trạng thái và hành động.</p>
                </div>

                {error && (
                    <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        Đang tải danh sách thẻ...
                    </div>
                ) : (
                    <>
                        <table className="cardpage-table">
                            <thead>
                                <tr>
                                    <th>MÃ THẺ</th>
                                    <th>LOẠI</th>
                                    <th>BIỂN SỐ</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCards.length > 0 ? (
                                    filteredCards.map((row) => (
                                        <tr key={row.code}>
                                            <td>{row.code}</td>
                                            <td>{row.type}</td>
                                            {/* <td>{row.plate}</td> */}
                                            <td>
                                                {row.plate || "Chưa đăng ký"}
                                            </td>
                                            <td>
                                                <span className={`cardpage-status ${row.status === 'Hoạt động' ? 'active' :
                                                    row.status === 'Đang chờ' ? 'pending' :
                                                        row.status === 'Đã xóa' ? 'deleted' :
                                                            row.status === 'Hết hạn' ? 'expired' : 'locked'
                                                    }`}>
                                                    <span className="material-symbols-outlined">circle</span>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="cardpage-icon-button"
                                                    onClick={() => handleEdit(row)}
                                                    title="Chỉnh sửa thẻ"
                                                >
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cardpage-icon-button"
                                                    style={{ color: '#ef4444' }}
                                                    onClick={() => handleDelete(row)}
                                                    title="Xóa thẻ"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            Không tìm thấy thẻ phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="cardpage-table-footer">
                            <span>Hiển thị {filteredCards.length} trong {totalCards}</span>
                            <div className="cardpage-pagination">
                                <button type="button" className="pagination-button" disabled>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button type="button" className="pagination-button active">1</button>
                                <button type="button" className="pagination-button" disabled>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* ===== Modal Đăng ký thẻ mới ===== */}
            {showModal && (
                <div
                    className="cardpage-modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
                >
                    <div className="cardpage-modal">
                        <div className="cardpage-modal-header">
                            {/* <h2>Đăng ký thẻ mới</h2> */}
                            <h2>
                                {editingCard ? 'Cập nhật thẻ' : 'Đăng ký thẻ mới'}
                            </h2>
                            <button
                                type="button"
                                className="cardpage-modal-close"
                                onClick={handleCloseModal}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form className="cardpage-modal-form" onSubmit={handleSubmit}>
                            <div className="cardpage-form-group">
                                <label htmlFor="type">Loại thẻ</label>
                                <select
                                    id="type"
                                    name="type"
                                    className="cardpage-select"
                                    value={formData.type}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="Thẻ tháng">Thẻ tháng</option>
                                    <option value="Thẻ lượt">Thẻ lượt</option>
                                </select>
                            </div>



                            {/* Biển số xe */}
                            <div className="cardpage-form-group">
                                <label htmlFor="plate">Biển số xe</label>
                                <input
                                    id="plate"
                                    name="plate"
                                    type="text"
                                    placeholder="Ví dụ: 30K-12345"
                                    className="cardpage-input"
                                    value={formData.plate}
                                    onChange={handleFormChange}
                                    required={formData.type === 'Thẻ tháng'}
                                />
                            </div>

                            {/* Ngày bắt đầu*/}
                            {/* <div className="cardpage-form-group">
                                <label htmlFor="startDate">Ngày bắt đầu</label>
                                <input
                                    id="startDate"
                                    // disabled={!!editingCard}
                                    name="startDate"
                                    type="date"
                                    className="cardpage-input"
                                    value={formData.startDate}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div> */}
                            {/* {!editingCard && (
                                <div className="cardpage-form-group">
                                    <label htmlFor="startDate">Ngày bắt đầu</label>
                                    <input
                                        id="startDate"
                                        name="startDate"
                                        type="date"
                                        className="cardpage-input"
                                        value={formData.startDate}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </div>
                            )} */}


                            {/* Thời gian vào */}
                            <div className="cardpage-form-group">
                                <label>Thời gian vào</label>

                                <input
                                    type="datetime-local"
                                    name="checkInTime"
                                    value={formData.checkInTime}
                                    onChange={handleFormChange}
                                    className="cardpage-input"
                                    disabled={!hasPlate}
                                />
                            </div>

                            {/* Thời gian ra */}
                            <div className="cardpage-form-group">
                                <label>Thời gian ra</label>

                                <input
                                    type="datetime-local"
                                    name="checkOutTime"
                                    value={formData.checkOutTime}
                                    onChange={handleFormChange}
                                    className="cardpage-input"
                                    disabled={!hasPlate}
                                />
                            </div>

                            {/* Trạng thái */}
                            <div className="cardpage-form-group">
                                <label>Trạng thái</label>

                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleFormChange}
                                    className="cardpage-select"
                                    disabled={!hasPlate}
                                >
                                    <option value="Hoạt động">Hoạt động</option>
                                    <option value="Đang chờ">Đang chờ</option>
                                    <option value="Đã xóa">Đã xóa</option>
                                    <option value="Hết hạn">Hết hạn</option>
                                </select>
                            </div>

                            {/* Chỉ hiển thị các trường sau nếu chọn Thẻ tháng */}
                            {formData.type === 'Thẻ tháng' && (
                                <>
                                    {/* Thời hạn đăng ký */}
                                    <div className="cardpage-form-group">
                                        <label htmlFor="durationMonths">Thời hạn đăng ký</label>
                                        <select
                                            id="durationMonths"
                                            name="durationMonths"
                                            className="cardpage-select"
                                            value={formData.durationMonths}
                                            onChange={handleFormChange}
                                            required
                                        >
                                            <option value="1">1 tháng</option>
                                            <option value="3">3 tháng</option>
                                            <option value="6">6 tháng</option>
                                            <option value="9">9 tháng</option>
                                            <option value="12">12 tháng</option>
                                        </select>
                                    </div>

                                    {/* Họ và tên khách hàng */}
                                    <div className="cardpage-form-group">
                                        <label htmlFor="fullName">Tên khách hàng</label>
                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            placeholder="Ví dụ: Nguyễn Văn A"
                                            className="cardpage-input"
                                            value={formData.fullName}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>

                                    {/* Số điện thoại */}
                                    <div className="cardpage-form-group">
                                        <label htmlFor="phone">Số điện thoại</label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="Ví dụ: 0987654321"
                                            className="cardpage-input"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="cardpage-form-group">
                                        <label htmlFor="email">Email</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Ví dụ: vana@gmail.com"
                                            className="cardpage-input"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* <div className="cardpage-form-group">
                                <label>Trạng thái</label>
                                <input
                                    type="text"
                                    className="cardpage-input"
                                    value="Hoạt động"
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                />
                            </div> */}

                            {formError && (
                                <p style={{ color: '#ff4d4d', fontSize: '0.875rem', margin: '4px 0' }}>
                                    {formError}
                                </p>
                            )}
                            {!hasPlate && editingCard && (
                                <p
                                    style={{
                                        color: '#f59e0b',
                                        fontSize: '14px',
                                        marginTop: '8px'
                                    }}
                                >
                                    Thẻ chưa có biển số nên không thể chỉnh sửa
                                    thời gian vào, thời gian ra và trạng thái.
                                </p>
                            )}

                            <div className="cardpage-modal-actions">
                                <button
                                    type="button"
                                    className="cardpage-button secondary"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="cardpage-button primary"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? 'Đang lưu...'
                                        : editingCard
                                            ? 'Cập nhật'
                                            : 'Đăng ký'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Toast notification popup */}
            {toast.show && (
                <div className={`custom-toast ${toast.type}`}>
                    <span className="material-symbols-outlined">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span className="toast-text">{toast.message}</span>
                </div>
            )}
        </main>
    )
}