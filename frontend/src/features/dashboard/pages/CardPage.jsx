import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCards, createCard } from '../../../service/cardApi';
import { useAuth } from '../../../context/AuthContext';

const ITEMS_PER_PAGE = 8;

const INITIAL_FORM = {
    type: 'Thẻ tháng',
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

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(defaultType);
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

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
        setSearch('');
        setTypeFilter(defaultType);
        setStatusFilter('Tất cả trạng thái');
    };

    // Filter logic
    const filteredCards = useMemo(() => {
        return cards.filter(card => {
            const codeLower = (card.code || '').toLowerCase();
            const plateLower = (card.plate || '').toLowerCase();
            const nameLower = (card.fullName || '').toLowerCase();
            const matchesSearch = search === '' ||
                codeLower.includes(search.toLowerCase()) ||
                plateLower.includes(search.toLowerCase()) ||
                nameLower.includes(search.toLowerCase());

            const matchesType = typeFilter === 'Tất cả loại thẻ' || card.type === typeFilter;
            const matchesStatus = statusFilter === 'Tất cả trạng thái' || card.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [cards, search, typeFilter, statusFilter]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, typeFilter, statusFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE);
    const paginatedCards = filteredCards.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    // Stats
    const total = cards.length;
    const active = cards.filter(c => c.status === 'Hoạt động').length;
    const locked = cards.filter(c => c.status === 'Đã khóa').length;
    const inactiveCount = total - active - locked;

    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const lockedPercent = total > 0 ? Math.round((locked / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactiveCount / total) * 100) : 0;

    // SVG donut calculations
    const circumference = 2 * Math.PI * 15.915;
    const activeStroke = (activePercent / 100) * circumference;
    const lockedStroke = (lockedPercent / 100) * circumference;
    const inactiveStroke = (inactivePercent / 100) * circumference;

    // Open modal
    const handleCreateCard = () => {
        setFormData({ ...INITIAL_FORM, type: defaultType === 'Tất cả loại thẻ' ? 'Thẻ tháng' : defaultType });
        setFormError(null);
        setShowModal(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setFormError(null);
    };

    // Handle form change
    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.startDate) {
            setFormError('Vui lòng chọn ngày bắt đầu.');
            return;
        }

        if (formData.type === 'Thẻ tháng') {
            if (!formData.plate || !formData.fullName || !formData.phone || !formData.email) {
                setFormError('Vui lòng điền đầy đủ thông tin khách hàng và biển số xe cho Thẻ tháng.');
                return;
            }
        }

        try {
            setSubmitting(true);
            const payload = {
                type: formData.type,
                startDate: formData.startDate,
                plate: formData.plate || undefined,
                fullName: formData.type === 'Thẻ tháng' ? formData.fullName : undefined,
                phone: formData.type === 'Thẻ tháng' ? formData.phone : undefined,
                email: formData.type === 'Thẻ tháng' ? formData.email : undefined,
                durationMonths: formData.type === 'Thẻ tháng' ? formData.durationMonths : undefined,
            };

            await createCard(payload);
            setShowModal(false);
            await fetchCards();
        } catch (err) {
            console.error('Error creating card:', err);
            setFormError(err?.response?.data?.error || err.message || 'Lỗi khi tạo thẻ.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        if (status === 'Hoạt động') return 'cp-status-badge cp-status-active';
        if (status === 'Đã khóa') return 'cp-status-badge cp-status-locked';
        return 'cp-status-badge cp-status-inactive'; // Đang chờ hoặc các trạng thái khác
    };

    return (
        <div className="cp-page">
            {/* Stats Row */}
            <div className="cp-stats-row">
                <div className="cp-stats-grid">
                    {/* Tổng số thẻ */}
                    <div className="cp-stat-card">
                        <div className="cp-stat-icon cp-stat-icon-primary">
                            <span className="material-symbols-outlined">credit_card</span>
                        </div>
                        <div>
                            <p className="cp-stat-label">Tổng số thẻ</p>
                            <p className="cp-stat-value">{loading ? '...' : total}</p>
                        </div>
                    </div>
                    {/* Đang hoạt động */}
                    <div className="cp-stat-card">
                        <div className="cp-stat-icon cp-stat-icon-secondary">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div>
                            <p className="cp-stat-label">Đang hoạt động</p>
                            <p className="cp-stat-value">{loading ? '...' : active}</p>
                        </div>
                    </div>
                    {/* Đã khóa */}
                    <div className="cp-stat-card">
                        <div className="cp-stat-icon cp-stat-icon-error">
                            <span className="material-symbols-outlined">block</span>
                        </div>
                        <div>
                            <p className="cp-stat-label">Đã khóa</p>
                            <p className="cp-stat-value">{loading ? '...' : locked}</p>
                        </div>
                    </div>
                    {/* Thẻ chưa hoạt động */}
                    <div className="cp-stat-card">
                        <div className="cp-stat-icon cp-stat-icon-warning">
                            <span className="material-symbols-outlined">date_range</span>
                        </div>
                        <div>
                            <p className="cp-stat-label">Thẻ đang chờ</p>
                            <p className="cp-stat-value">{loading ? '...' : inactiveCount}</p>
                        </div>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="cp-donut-card">
                    <h3 className="cp-donut-title">TỶ LỆ TRẠNG THÁI THẺ</h3>
                    <div className="cp-donut-wrapper">
                        <svg className="cp-donut-svg" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="3" />
                            {/* Active */}
                            <circle cx="18" cy="18" r="15.915" fill="transparent"
                                stroke="#006d38"
                                strokeWidth="3"
                                strokeDasharray={`${activeStroke} ${circumference - activeStroke}`}
                                strokeDashoffset="25"
                            />
                            {/* Locked */}
                            {lockedPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#ba1a1a"
                                    strokeWidth="3"
                                    strokeDasharray={`${lockedStroke} ${circumference - lockedStroke}`}
                                    strokeDashoffset={25 - activeStroke}
                                />
                            )}
                            {/* Inactive / Đang chờ */}
                            {inactivePercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="hsla(54, 89%, 49%, 1.00)"
                                    strokeWidth="3"
                                    strokeDasharray={`${inactiveStroke} ${circumference - inactiveStroke}`}
                                    strokeDashoffset={25 - activeStroke - lockedStroke}
                                />
                            )}
                        </svg>
                        <div className="cp-donut-center">
                            <span className="cp-donut-percent">{loading ? '...' : `${activePercent}%`}</span>
                            <span className="cp-donut-sub">Hoạt động</span>
                        </div>
                    </div>
                    <div className="cp-donut-legend">
                        <div className="cp-legend-item">
                            <div className="cp-legend-dot cp-legend-active"></div>
                            <span>Hoạt động</span>
                        </div>
                        <div className="cp-legend-item">
                            <div className="cp-legend-dot cp-legend-locked"></div>
                            <span>Đã khóa</span>
                        </div>
                        <div className="cp-legend-item">
                            <div className="cp-legend-dot cp-legend-inactive"></div>
                            <span>Đang chờ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="cp-action-bar">
                <div className="cp-filters">
                    <div className="cp-search-wrapper">
                        <span className="material-symbols-outlined cp-search-icon">search</span>
                        <input
                            type="text"
                            className="cp-search-input"
                            placeholder="Tìm theo mã thẻ, biển số, tên chủ xe..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="cp-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Đã khóa">Đã khóa</option>
                        <option value="Đang chờ">Đang chờ</option>
                    </select>
                </div>
                <div className="cp-action-buttons">
                    <button type="button" className="cp-btn cp-btn-outline" onClick={handleResetFilters}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                        Làm mới
                    </button>
                    <button type="button" className="cp-btn cp-btn-primary" onClick={handleCreateCard}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Đăng ký thẻ mới
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="cp-table-card">
                {error && (
                    <div className="cp-error-message">{error}</div>
                )}

                {loading ? (
                    <div className="cp-loading-message">Đang tải danh sách thẻ...</div>
                ) : (
                    <>
                        <div className="cp-table-scroll">
                            <table className="cp-table">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Mã thẻ</th>
                                        <th>Loại thẻ</th>
                                        <th>Biển số</th>
                                        <th>Trạng thái</th>
                                        <th className="cp-th-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCards.length > 0 ? (
                                        paginatedCards.map((row, index) => (
                                            <tr key={row.code || index} className="cp-table-row">
                                                <td>{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</td>
                                                <td className="cp-td-bold">{row.code}</td>
                                                <td>{row.type}</td>
                                                <td>{row.plate || '---'}</td>
                                                <td>
                                                    <span className={getStatusBadgeClass(row.status)}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="cp-td-center">
                                                    <button type="button" className="cp-edit-btn">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="cp-empty-row">
                                                Không tìm thấy thẻ phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="cp-pagination-footer">
                            <p className="cp-pagination-info">
                                Hiển thị {filteredCards.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCards.length)} của {filteredCards.length} kết quả
                            </p>
                            <div className="cp-pagination-controls">
                                <button
                                    className="cp-page-nav"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                {getPageNumbers().map((page, i) => (
                                    page === '...' ? (
                                        <span key={`dots-${i}`} className="cp-page-dots">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            className={`cp-page-btn ${currentPage === page ? 'cp-page-btn-active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    )
                                ))}
                                <button
                                    className="cp-page-nav"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Registration Modal */}
            {showModal && (
                <div className="cp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
                    <div className="cp-modal">
                        <div className="cp-modal-header">
                            <h2>Đăng ký thẻ mới</h2>
                            <button type="button" className="cp-modal-close" onClick={handleCloseModal}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form className="cp-modal-form" onSubmit={handleSubmit}>
                            {/* 1. Loại thẻ */}
                            <div className="cp-form-group">
                                <label htmlFor="type">Loại thẻ</label>
                                <select
                                    id="type"
                                    name="type"
                                    className="cp-select"
                                    value={formData.type}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="Thẻ tháng">Thẻ tháng</option>
                                    <option value="Thẻ lượt">Thẻ lượt</option>
                                </select>
                            </div>

                            {/* 2. Biển số xe */}
                            <div className="cp-form-group">
                                <label htmlFor="plate">Biển số xe {formData.type === 'Thẻ tháng' && <span style={{ color: '#ba1a1a' }}>*</span>}</label>
                                <input
                                    id="plate"
                                    name="plate"
                                    type="text"
                                    placeholder="Ví dụ: 30K-12345"
                                    className="cp-input"
                                    value={formData.plate}
                                    onChange={handleFormChange}
                                    required={formData.type === 'Thẻ tháng'}
                                />
                            </div>

                            {/* 3. Ngày bắt đầu */}
                            <div className="cp-form-group">
                                <label htmlFor="startDate">Ngày bắt đầu</label>
                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    className="cp-input"
                                    value={formData.startDate}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>

                            {/* Conditional Client Fields when Type is Monthly Card */}
                            {formData.type === 'Thẻ tháng' && (
                                <>
                                    {/* 4. Thời hạn đăng ký */}
                                    <div className="cp-form-group">
                                        <label htmlFor="durationMonths">Thời hạn đăng ký</label>
                                        <select
                                            id="durationMonths"
                                            name="durationMonths"
                                            className="cp-select"
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

                                    {/* 5. Tên khách hàng */}
                                    <div className="cp-form-group">
                                        <label htmlFor="fullName">Tên khách hàng <span style={{ color: '#ba1a1a' }}>*</span></label>
                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            placeholder="Ví dụ: Nguyễn Văn A"
                                            className="cp-input"
                                            value={formData.fullName}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>

                                    {/* 6. Số điện thoại */}
                                    <div className="cp-form-group">
                                        <label htmlFor="phone">Số điện thoại <span style={{ color: '#ba1a1a' }}>*</span></label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="Ví dụ: 0987654321"
                                            className="cp-input"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>

                                    {/* 7. Email */}
                                    <div className="cp-form-group">
                                        <label htmlFor="email">Email <span style={{ color: '#ba1a1a' }}>*</span></label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Ví dụ: vana@gmail.com"
                                            className="cp-input"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* 8. Trạng thái */}
                            <div className="cp-form-group">
                                <label>Trạng thái mặc định</label>
                                <input
                                    type="text"
                                    className="cp-input"
                                    value="Hoạt động"
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#f9fafb' }}
                                />
                            </div>

                            {formError && (
                                <p className="cp-form-error">
                                    {formError}
                                </p>
                            )}

                            <div className="cp-modal-actions">
                                <button
                                    type="button"
                                    className="cp-btn cp-btn-outline"
                                    onClick={handleCloseModal}
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
            )}
        </div>
    );
}