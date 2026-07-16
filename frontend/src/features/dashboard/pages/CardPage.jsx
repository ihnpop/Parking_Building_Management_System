import { useState, useEffect, useRef } from 'react'
import { getCards, createCard, deleteCard } from '../../../service/cardApi';

/**
 * CardPage displays a centralized card management workspace.
 * Fetching data dynamically from Supabase via backend API.
 */

const INITIAL_FORM = {
    code: '',
    type: 'Thẻ lượt',
    plate: '',
    startDate: new Date().toISOString().split('T')[0],
};

export default function CardPage({ defaultType = 'Thẻ lượt' }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // Action dropdown state
    const [openActionMenu, setOpenActionMenu] = useState(null);
    const actionMenuRef = useRef(null);

    // Filters - Tự động nhận defaultType từ Tab lớn bên ngoài truyền vào
    const [typeFilter, setTypeFilter] = useState(defaultType);
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

    // Đồng bộ lại bộ lọc nếu defaultType từ Tab lớn thay đổi
    useEffect(() => {
        setTypeFilter(defaultType);
    }, [defaultType]);

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
        setTypeFilter(defaultType);
        setStatusFilter('Tất cả trạng thái');
    };

    // Filter logic chuẩn theo các thuộc tính gốc (card.type, card.status)
    const filteredCards = cards.filter(card => {
        const matchesType = typeFilter === 'Tất cả loại thẻ' || card.type === typeFilter;
        const matchesStatus = statusFilter === 'Tất cả trạng thái' || card.status === statusFilter;
        return matchesType && matchesStatus;
    });

    // Thống kê số lượng (Stats)
    const totalCards = cards.length;
    const activeCards = cards.filter(c => c.status === 'Hoạt động').length;
    const lockedCards = cards.filter(c => c.status === 'Đã khóa').length;

    const summaryItems = [
        { label: 'TỔNG SỐ THẺ', value: totalCards, note: 'Tất cả các thẻ đang quản lý' },
        { label: 'ĐANG HOẠT ĐỘNG', value: activeCards, note: 'Thẻ hiện đang sử dụng được' },
        { label: 'ĐÃ KHÓA', value: lockedCards, note: 'Thẻ bị chặn hoặc vô hiệu' },
    ];

    // Open modal
    const handleCreateCard = () => {
        setFormData({ ...INITIAL_FORM, type: defaultType }); // Gợi ý sẵn loại thẻ theo tab đang chọn
        setFormError(null);
        setShowModal(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setFormError(null);
    };

    // Open delete confirmation modal
    const handleOpenDeleteModal = (card) => {
        setCardToDelete(card);
        setDeleteError(null);
        setShowDeleteModal(true);
        setOpenActionMenu(null);
    };

    // Close delete modal
    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setCardToDelete(null);
        setDeleteError(null);
    };

    // Confirm delete
    const handleConfirmDelete = async () => {
        if (!cardToDelete) return;
        try {
            setDeleting(true);
            setDeleteError(null);
            await deleteCard(cardToDelete.card_id);
            setShowDeleteModal(false);
            setCardToDelete(null);
            await fetchCards();
        } catch (err) {
            console.error('Error deleting card:', err);
            setDeleteError(err?.response?.data?.error || err.message || 'Lỗi khi xóa thẻ.');
        } finally {
            setDeleting(false);
        }
    };

    // Toggle action dropdown
    const handleToggleActionMenu = (cardCode) => {
        setOpenActionMenu(prev => prev === cardCode ? null : cardCode);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                setOpenActionMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle form field change
    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Submit create card
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.code.trim()) {
            setFormError('Vui lòng nhập Mã thẻ.');
            return;
        }

        if (!formData.startDate) {
            setFormError('Vui lòng chọn ngày bắt đầu.');
            return;
        }

        try {
            setSubmitting(true);
            await createCard({
                code: formData.code.trim(),
                type: formData.type,
                plate: formData.plate.trim() || null,
                startDate: formData.startDate,
                status: 'Hoạt động'
            });
            setShowModal(false);
            await fetchCards(); // Tải lại bảng dữ liệu ngay lập tức
        } catch (err) {
            console.error('Error creating card:', err);
            setFormError(err?.response?.data?.error || err.message || 'Lỗi khi tạo thẻ.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="card-page" style={{ width: '100%' }}>

            {/* Khối thống kê số lượng thẻ phía trên */}
            <section className="cardpage-summary-grid" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {summaryItems.map((item) => (
                    <article key={item.label} className="cardpage-summary-card" style={{ flex: 1, padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                        <p className="summary-label" style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#666' }}>{item.label}</p>
                        <p className="summary-value" style={{ margin: '0 0 5px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>{loading ? '...' : item.value}</p>
                        <p className="summary-note" style={{ margin: 0, fontSize: '0.75rem', color: '#999' }}>{item.note}</p>
                    </article>
                ))}
            </section>

            {/* Thanh công cụ tìm kiếm và bộ lọc */}
            <section className="cardpage-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
                <div className="cardpage-filters" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div className="cardpage-filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#555' }}>Loại thẻ</label>
                        <select
                            className="cardpage-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="Tất cả loại thẻ">Tất cả loại thẻ</option>
                            <option value="Thẻ lượt">Thẻ lượt</option>
                            <option value="Thẻ tháng">Thẻ tháng</option>
                        </select>
                    </div>

                    <div className="cardpage-filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#555' }}>Trạng thái</label>
                        <select
                            className="cardpage-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                        >
                            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Đã khóa">Đã khóa</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        className="cardpage-button secondary"
                        onClick={handleResetFilters}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', marginTop: '22px' }}
                    >
                        Làm mới bộ lọc
                    </button>
                </div>

                <div className="cardpage-actions" style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                    <button
                        type="button"
                        className="cardpage-button outline"
                        onClick={fetchCards}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                    >
                        Tải lại dữ liệu
                    </button>
                    <button
                        type="button"
                        className="cardpage-button primary"
                        onClick={handleCreateCard}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#e65c00', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + Đăng ký thẻ mới
                    </button>
                </div>
            </section>

            {/* Khối hiển thị Bảng danh sách thẻ */}
            <section className="cardpage-table-card" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px' }}>
                <div className="cardpage-table-header" style={{ marginBottom: '15px' }}>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>Danh sách thẻ</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Quản lý thông tin thẻ, loại thẻ, trạng thái và hành động.</p>
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
                        <table className="cardpage-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>MÃ THẺ</th>
                                    <th style={{ padding: '12px' }}>LOẠI</th>
                                    <th style={{ padding: '12px' }}>BIỂN SỐ</th>
                                    <th style={{ padding: '12px' }}>TRẠNG THÁI</th>
                                    <th style={{ padding: '12px' }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCards.length > 0 ? (
                                    filteredCards.map((row) => (
                                        <tr key={row.code} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px' }}>{row.code}</td>
                                            <td style={{ padding: '12px' }}>{row.type}</td>
                                            <td style={{ padding: '12px' }}>{row.plate || '---'}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span className={`cardpage-status ${row.status === 'Hoạt động' ? 'active' : 'locked'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: row.status === 'Hoạt động' ? '#4caf50' : '#f44336' }}>circle</span>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div className="cardpage-action-wrapper" ref={openActionMenu === row.code ? actionMenuRef : null}>
                                                    <button
                                                        type="button"
                                                        className="cardpage-icon-button"
                                                        title="Thao tác"
                                                        onClick={() => handleToggleActionMenu(row.code)}
                                                    >
                                                        <span className="material-symbols-outlined">more_vert</span>
                                                    </button>
                                                    {openActionMenu === row.code && (
                                                        <div className="cardpage-action-menu">
                                                            <button
                                                                type="button"
                                                                className="cardpage-action-menu-item"
                                                                onClick={() => { setOpenActionMenu(null); }}
                                                            >
                                                                <span className="material-symbols-outlined">edit</span>
                                                                Chỉnh sửa
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="cardpage-action-menu-item danger"
                                                                onClick={() => handleOpenDeleteModal(row)}
                                                            >
                                                                <span className="material-symbols-outlined">delete</span>
                                                                Xóa thẻ
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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

                        {/* Phân trang (Pagination) */}
                        <div className="cardpage-table-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>Hiển thị {filteredCards.length} trong {totalCards}</span>
                            <div className="cardpage-pagination" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button type="button" className="pagination-button" disabled style={{ padding: '5px 8px', cursor: 'not-allowed' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                                </button>
                                <button type="button" className="pagination-button active" style={{ padding: '5px 12px', backgroundColor: '#e65c00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>1</button>
                                <button type="button" className="pagination-button" disabled style={{ padding: '5px 8px', cursor: 'not-allowed' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* ===== Modal Xác nhận Xóa Thẻ ===== */}
            {showDeleteModal && cardToDelete && (
                <div
                    className="cardpage-modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseDeleteModal(); }}
                >
                    <div className="cardpage-modal cardpage-delete-modal">
                        <div className="cardpage-delete-modal-icon">
                            <span className="material-symbols-outlined">delete_forever</span>
                        </div>
                        <h2 className="cardpage-delete-modal-title">Xác nhận xóa thẻ</h2>
                        <p className="cardpage-delete-modal-desc">
                            Bạn có chắc chắn muốn xóa thẻ này không?
                        </p>
                        <div className="cardpage-delete-modal-info">
                            <div className="cardpage-delete-info-row">
                                <span className="delete-info-label">Mã thẻ</span>
                                <span className="delete-info-value">{cardToDelete.code}</span>
                            </div>
                            <div className="cardpage-delete-info-row">
                                <span className="delete-info-label">Loại thẻ</span>
                                <span className="delete-info-value">{cardToDelete.type}</span>
                            </div>
                            <div className="cardpage-delete-info-row">
                                <span className="delete-info-label">Biển số</span>
                                <span className="delete-info-value">{cardToDelete.plate}</span>
                            </div>
                            <div className="cardpage-delete-info-row">
                                <span className="delete-info-label">Trạng thái</span>
                                <span className={`cardpage-status ${cardToDelete.status === 'Hoạt động' ? 'active' : 'locked'}`}>
                                    <span className="material-symbols-outlined">circle</span>
                                    {cardToDelete.status}
                                </span>
                            </div>
                        </div>
                        <p className="cardpage-delete-modal-warning">
                            ⚠️ Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến thẻ này sẽ bị xóa vĩnh viễn.
                        </p>
                        {deleteError && (
                            <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', margin: '0' }}>
                                {deleteError}
                            </p>
                        )}
                        <div className="cardpage-modal-actions">
                            <button
                                type="button"
                                className="cardpage-button secondary"
                                onClick={handleCloseDeleteModal}
                                disabled={deleting}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                className="cardpage-button danger"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                            >
                                <span className="material-symbols-outlined">{deleting ? 'hourglass_empty' : 'delete'}</span>
                                {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}