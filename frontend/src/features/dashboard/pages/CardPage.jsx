import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCards, createCard } from '../../../service/cardApi';
import { useAuth } from '../../../context/AuthContext';

/**
 * CardPage displays a centralized card management workspace.
 * Fetching data dynamically from Supabase via backend API.
 */

const INITIAL_FORM = {
    code: '', // Đã khôi phục trường nhập mã UID thẻ vật lý
    type: 'Thẻ lượt',
    plate: '',
    fullName: '',
    phone: '',
    email: '',
    durationMonths: '1',
    startDate: new Date().toISOString().split('T')[0],
};

export default function CardPage({ defaultType = 'Thẻ lượt' }) {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    const role = userRole ? userRole.toUpperCase() : 'STAFF';
    const getRoleLabel = (r) => {
        switch (r) {
            case 'ADMIN': return 'Admin';
            case 'MANAGER': return 'Manager';
            case 'STAFF': return 'Staff';
            default: return r;
        }
    };

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

    // Handle form field change
    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Submit create card nâng cao gộp cả Thẻ Lượt lẫn Thẻ Tháng
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.code.trim()) {
            setFormError('Vui lòng nhập Mã thẻ (UID).');
            return;
        }

        if (!formData.startDate) {
            setFormError('Vui lòng chọn ngày bắt đầu.');
            return;
        }

        if (formData.type === 'Thẻ tháng') {
            if (!formData.plate.trim() || !formData.fullName.trim() || !formData.phone.trim() || !formData.email.trim()) {
                setFormError('Vui lòng điền đầy đủ thông tin khách hàng và biển số xe khi đăng ký Thẻ tháng.');
                return;
            }
        }

        try {
            setSubmitting(true);

            // Xây dựng payload động theo loại thẻ được chọn
            const payload = {
                code: formData.code.trim(),
                type: formData.type,
                startDate: formData.startDate,
                status: 'Hoạt động',
                plate: formData.plate.trim() || null
            };

            // Nếu là Thẻ tháng, đính kèm thêm thông tin gia hạn và liên hệ khách hàng
            if (formData.type === 'Thẻ tháng') {
                payload.fullName = formData.fullName.trim();
                payload.phone = formData.phone.trim();
                payload.email = formData.email.trim();
                payload.durationMonths = formData.durationMonths;
            }

            await createCard(payload);
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
            <section className="cardpage-table-card" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', background: '#fff' }}>
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
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{row.code}</td>
                                            <td style={{ padding: '12px' }}>{row.type}</td>
                                            <td style={{ padding: '12px' }}>{row.plate || '---'}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span className={`cardpage-status ${row.status === 'Hoạt động' ? 'active' : 'locked'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: row.status === 'Hoạt động' ? '#4caf50' : '#f44336' }}>circle</span>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <button type="button" className="cardpage-icon-button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
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

            {/* ===== Modal Đăng ký thẻ mới Nâng cao (Gộp trường Động) ===== */}
            {showModal && (
                <div
                    className="cardpage-modal-overlay"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
                >
                    <div className="cardpage-modal" style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <div className="cardpage-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Đăng ký thẻ mới</h2>
                            <button
                                type="button"
                                className="cardpage-modal-close"
                                onClick={handleCloseModal}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form className="cardpage-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                            {/* 1. Mã thẻ vật lý (UID) */}
                            <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label htmlFor="code" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Mã thẻ (UID)</label>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    className="cardpage-input"
                                    placeholder="Ví dụ: 04FA23B1"
                                    value={formData.code}
                                    onChange={handleFormChange}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required
                                />
                            </div>

                            {/* 2. Loại thẻ */}
                            <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label htmlFor="type" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Loại thẻ</label>
                                <select
                                    id="type"
                                    name="type"
                                    className="cardpage-select"
                                    value={formData.type}
                                    onChange={handleFormChange}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
                                    required
                                >
                                    <option value="Thẻ lượt">Thẻ lượt</option>
                                    <option value="Thẻ tháng">Thẻ tháng</option>
                                </select>
                            </div>

                            {/* 3. Biển số xe */}
                            <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label htmlFor="plate" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Biển số xe {formData.type === 'Thẻ tháng' && <span style={{ color: 'red' }}>*</span>}</label>
                                <input
                                    id="plate"
                                    name="plate"
                                    type="text"
                                    placeholder="Ví dụ: 29A-123.45"
                                    className="cardpage-input"
                                    value={formData.plate}
                                    onChange={handleFormChange}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required={formData.type === 'Thẻ tháng'}
                                />
                            </div>

                            {/* 4. Ngày bắt đầu hiệu lực */}
                            <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label htmlFor="startDate" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Ngày bắt đầu</label>
                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    className="cardpage-input"
                                    value={formData.startDate}
                                    onChange={handleFormChange}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                    required
                                />
                            </div>

                            {/* ===== KHỐI THÔNG TIN BỔ SUNG: Chỉ hiển thị khi chọn Thẻ tháng ===== */}
                            {formData.type === 'Thẻ tháng' && (
                                <>
                                    {/* Thời hạn gia hạn đăng ký trước */}
                                    <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label htmlFor="durationMonths" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Thời hạn đăng ký</label>
                                        <select
                                            id="durationMonths"
                                            name="durationMonths"
                                            className="cardpage-select"
                                            value={formData.durationMonths}
                                            onChange={handleFormChange}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
                                            required
                                        >
                                            <option value="1">1 tháng</option>
                                            <option value="3">3 tháng</option>
                                            <option value="6">6 tháng</option>
                                            <option value="9">9 tháng</option>
                                            <option value="12">12 tháng</option>
                                        </select>
                                    </div>

                                    {/* Tên chủ thẻ */}
                                    <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label htmlFor="fullName" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Tên khách hàng <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            placeholder="Ví dụ: Nguyễn Văn A"
                                            className="cardpage-input"
                                            value={formData.fullName}
                                            onChange={handleFormChange}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            required
                                        />
                                    </div>

                                    {/* SĐT liên lạc */}
                                    <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label htmlFor="phone" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="Ví dụ: 0987654321"
                                            className="cardpage-input"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            required
                                        />
                                    </div>

                                    {/* Địa chỉ Email nhận biên lai */}
                                    <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label htmlFor="email" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Email <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Ví dụ: vana@gmail.com"
                                            className="cardpage-input"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* 5. Trạng thái mặc định */}
                            <div className="cardpage-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Trạng thái mặc định</label>
                                <input
                                    type="text"
                                    className="cardpage-input"
                                    value="Hoạt động"
                                    disabled
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                                />
                            </div>

                            {formError && (
                                <p style={{ color: '#ff4d4d', fontSize: '0.875rem', margin: '4px 0', fontWeight: '500' }}>
                                    {formError}
                                </p>
                            )}

                            <div className="cardpage-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    className="cardpage-button secondary"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="cardpage-button primary"
                                    disabled={submitting}
                                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#e65c00', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    {submitting ? 'Đang lưu...' : 'Đăng ký'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}