// Import hooks React: useState (quản lý state), useEffect (side effect), useMemo (tối ưu hóa tính toán bộ lọc)
import { useState, useEffect, useMemo } from 'react';
// Import API service thao tác thẻ (lấy danh sách thẻ, xóa thẻ)
import { getCards, deleteCard } from '../../../service/cardApi';
// Import AuthContext để lấy thông tin user đăng nhập (lưu ID người thực hiện xóa)
import { useAuth } from '../../../context/AuthContext';
// Import NotificationContext để gọi thông báo toast và hộp thoại xác nhận
import { useNotification } from '../../../context/NotificationContext';
// Import Dialog modal Tạo thẻ mới và Sửa thông tin thẻ
import CreateCardPageDialog from '../components/CreateCardPageDialog';
import EditCardPageDialog from '../components/EditCardPageDialog';
// Import CSS riêng của trang quản lý thẻ
import "./CardPage.css";

// Số lượng bản ghi thẻ hiển thị trên mỗi trang phân trang (Pagination)
const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────
// Component Trang Quản Lý Thẻ (Card Management Page)
// ─────────────────────────────────────────────
export default function CardPage({ defaultType = 'Thẻ lượt' }) {
    // Lấy thông tin người dùng hiện tại từ AuthContext
    const { user } = useAuth();
    // Lấy hàm showToast và showConfirm từ NotificationContext
    const { showToast, showConfirm } = useNotification();

    // State mảng chứa danh sách thẻ gửi xe
    const [cards, setCards] = useState([]);
    // State kiểm soát hiệu ứng spinner loading khi fetch dữ liệu thẻ
    const [loading, setLoading] = useState(true);
    // State lưu thông báo lỗi nếu có sự cố gọi API
    const [error, setError] = useState(null);

    // State đóng/mở các Modal Popup: Tạo thẻ và Chỉnh sửa thông tin thẻ
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);

    // Các state cho bộ lọc: từ khóa tìm kiếm (search), lọc trạng thái (statusFilter), trang hiện tại (currentPage)
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');
    const [currentPage, setCurrentPage] = useState(1);

    // Hàm gọi API lấy danh sách toàn bộ thẻ gửi xe từ backend
    const fetchCards = async (pageOverride) => {
        try {
            setLoading(true);
            const data = await getCards();

            // Sắp xếp danh sách thẻ mới nhất lên đầu (Newest First)
            const sortedData = [...data].sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at) : 0;
                const dateB = b.created_at ? new Date(b.created_at) : 0;
                if (dateB.getTime() !== dateA.getTime()) {
                    return dateB - dateA;
                }
                return (b.code || '').localeCompare(a.code || '');
            });

            setCards(sortedData);
            setError(null);
            if (pageOverride !== undefined) {
                setCurrentPage(pageOverride);
            }
        } catch (err) {
            console.error("Error loading cards:", err);
            setError("Không thể tải danh sách thẻ. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    // Tự động gọi API fetch thẻ khi component được mount
    useEffect(() => { fetchCards(); }, []);

    // ── Xử lý các sự kiện click ──────────────────────────────

    // Mở modal tạo thẻ gửi xe mới
    const handleCreateCard = () => {
        setIsCreateOpen(true);
    };

    // Mở modal chỉnh sửa thông tin thẻ
    const handleEdit = (card) => {
        setEditingCard(card);
        setIsEditOpen(true);
    };

    // Xử lý xóa thẻ (chuyển sang trạng thái "Đã khóa") — Chỉ áp dụng cho thẻ ở trạng thái "Đang chờ"
    const handleDelete = async (row) => {
        if (row.status !== 'Đang chờ') return;
        showConfirm({
            title: "Xóa thẻ",
            message: `Bạn chắc chắn muốn xóa thẻ ${row.code}? Thẻ sẽ chuyển sang trạng thái "Đã khóa" và ẩn khỏi danh sách.`,
            confirmText: "Xóa thẻ",
            cancelText: "Hủy",
            isDangerous: true,
            onConfirm: async () => {
                try {
                    const res = await deleteCard(row.card_id, user?.id);
                    if (res.success) {
                        showToast(res.message || "Xóa thẻ thành công", "success");
                        await fetchCards(); // Tải lại danh sách sau khi xóa
                    } else {
                        showToast(res.message || "Xóa thẻ thất bại", "error");
                    }
                } catch (err) {
                    const errMsg = err.response?.data?.message || err.message || "Xóa thẻ thất bại";
                    showToast(errMsg, "error");
                }
            }
        });
    };

    // ── Xử lý Bộ Lọc & Phân Trang (Filter & Pagination) ────

    // Đặt lại tất cả các bộ lọc về mặc định
    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('Tất cả trạng thái');
        setCurrentPage(1);
        fetchCards(1);
    };

    // Lọc danh sách thẻ dựa trên từ khóa tìm kiếm (mã thẻ, biển số) và trạng thái thẻ
    const filteredCards = useMemo(() => cards.filter(card => {
        const matchesSearch = search === '' ||
            (card.code || '').toLowerCase().includes(search.toLowerCase()) ||
            (card.plate || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'Tất cả trạng thái' || card.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [cards, search, statusFilter]);

    // Đưa trang về 1 khi từ khóa tìm kiếm hoặc bộ lọc trạng thái thay đổi
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

    // Tính toán tổng số trang và cắt mảng dữ liệu thẻ hiển thị cho trang hiện tại
    const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE);
    const paginatedCards = filteredCards.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Tạo danh sách số trang hiển thị thanh phân trang (có dấu '...' cho trang quá dài)
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

    // ── Thống kê tỷ lệ thẻ & Vẽ Biểu đồ Donut SVG ────────────

    const total = cards.length;
    const active = cards.filter(c => c.status === 'Hoạt động').length;
    const locked = cards.filter(c => c.status === 'Đã khóa').length;
    const inactiveCount = total - active - locked;

    // Tính phần trăm từng loại trạng thái
    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const lockedPercent = total > 0 ? Math.round((locked / total) * 100) : 0;
    const inactivePercent = total > 0 ? Math.round((inactiveCount / total) * 100) : 0;

    // Đánh bán kính chu vi viền tròn donut SVG
    const circumference = 2 * Math.PI * 15.915;
    const activeStroke = (activePercent / 100) * circumference;
    const lockedStroke = (lockedPercent / 100) * circumference;
    const inactiveStroke = (inactivePercent / 100) * circumference;

    // Hàm trả về CSS badge trạng thái thẻ
    const getStatusBadgeClass = (status) => {
        if (status === 'Hoạt động') return 'mc-status-badge mc-status-active';
        if (status === 'Đã khóa') return 'mc-status-badge mc-status-expired';
        return 'mc-status-badge mc-status-expiring';
    };

    // ── Render Giao diện Trang ────────────────────────────────

    return (
        <div className="mc-page">
            {/* Khối các Card Thống Kê Chỉ Số Tổng Hợp */}
            <div className="mc-stats-row">
                <div className="mc-stats-grid">
                    {/* Card Tổng số thẻ */}
                    <div className="mc-stat-card mc-stat-primary">
                        <div className="mc-stat-card-header">
                            <div className="mc-stat-icon">
                                <span className="material-symbols-outlined">credit_card</span>
                            </div>
                            <span className="mc-stat-badge">Tổng</span>
                        </div>
                        <div className="mc-stat-body">
                            <p className="mc-stat-value">{loading ? '...' : total}</p>
                            <p className="mc-stat-label">Tổng số thẻ</p>
                        </div>
                    </div>
                    {/* Card Số thẻ đang hoạt động */}
                    <div className="mc-stat-card mc-stat-success">
                        <div className="mc-stat-card-header">
                            <div className="mc-stat-icon">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <span className="mc-stat-badge">Hoạt động</span>
                        </div>
                        <div className="mc-stat-body">
                            <p className="mc-stat-value">{loading ? '...' : active}</p>
                            <p className="mc-stat-label">Đang hoạt động</p>
                        </div>
                    </div>
                    {/* Card Số thẻ đã khóa */}
                    <div className="mc-stat-card mc-stat-danger">
                        <div className="mc-stat-card-header">
                            <div className="mc-stat-icon">
                                <span className="material-symbols-outlined">gpp_bad</span>
                            </div>
                            <span className="mc-stat-badge">Đã khóa</span>
                        </div>
                        <div className="mc-stat-body">
                            <p className="mc-stat-value">{loading ? '...' : locked}</p>
                            <p className="mc-stat-label">Đã khóa</p>
                        </div>
                    </div>
                    {/* Card Số thẻ đang chờ */}
                    <div className="mc-stat-card mc-stat-warning">
                        <div className="mc-stat-card-header">
                            <div className="mc-stat-icon">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <span className="mc-stat-badge">Đang chờ</span>
                        </div>
                        <div className="mc-stat-body">
                            <p className="mc-stat-value">{loading ? '...' : inactiveCount}</p>
                            <p className="mc-stat-label">Thẻ đang chờ</p>
                        </div>
                    </div>
                </div>

                {/* Biểu Đồ Donut SVG Thống Kê Tỷ Lệ Trạng Thái Thẻ */}
                <div className="mc-donut-card">
                    <h3 className="mc-donut-title">TỶ LỆ TRẠNG THÁI THẺ</h3>
                    <div className="mc-donut-wrapper">
                        <svg className="mc-donut-svg" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e1e1ee" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.915" fill="transparent"
                                stroke="#006d38" strokeWidth="3"
                                strokeDasharray={`${activeStroke} ${circumference - activeStroke}`}
                                strokeDashoffset="25"
                            />
                            {lockedPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#ba1a1a" strokeWidth="3"
                                    strokeDasharray={`${lockedStroke} ${circumference - lockedStroke}`}
                                    strokeDashoffset={25 - activeStroke}
                                />
                            )}
                            {inactivePercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#d0c715ff" strokeWidth="3"
                                    strokeDasharray={`${inactiveStroke} ${circumference - inactiveStroke}`}
                                    strokeDashoffset={25 - activeStroke - lockedStroke}
                                />
                            )}
                        </svg>
                        <div className="mc-donut-center">
                            <span className="mc-donut-percent">{loading ? '...' : `${activePercent}%`}</span>
                            <span className="mc-donut-sub">Hoạt động</span>
                        </div>
                    </div>
                    <div className="mc-donut-legend">
                        <div className="mc-legend-item"><div className="mc-legend-dot mc-legend-active"></div><span>Hoạt động</span></div>
                        <div className="mc-legend-item"><div className="mc-legend-dot mc-legend-expired"></div><span>Đã khóa</span></div>
                        <div className="mc-legend-item"><div className="mc-legend-dot mc-legend-expiring"></div><span>Đang chờ</span></div>
                    </div>
                </div>
            </div>

            {/* Thanh Công Cụ Bộ Lọc & Nút Đăng Ký Thẻ */}
            <div className="mc-action-bar">
                <div className="mc-filters">
                    {/* Ô nhập từ khóa tìm kiếm */}
                    <div className="mc-search-wrapper">
                        <span className="material-symbols-outlined mc-search-icon">search</span>
                        <input
                            type="text"
                            className="mc-search-input"
                            placeholder="Tìm theo mã thẻ, biển số..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Dropdown chọn lọc theo trạng thái */}
                    <select
                        className="mc-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Đang chờ">Đang chờ</option>
                        <option value="Đã khóa">Đã khóa</option>
                    </select>
                </div>
                <div className="mc-action-buttons">
                    <button type="button" className="mc-btn mc-btn-outline" onClick={handleResetFilters}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                        Làm mới
                    </button>
                    <button type="button" className="mc-btn mc-btn-primary" onClick={handleCreateCard}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Đăng ký thẻ mới
                    </button>
                </div>
            </div>

            {/* Bảng Dữ Liệu Thẻ Gửi Xe */}
            <div className="mc-table-card">
                {error && <div className="mc-error-message">{error}</div>}

                {loading ? (
                    <div className="mc-loading-message">Đang tải danh sách thẻ...</div>
                ) : (
                    <>
                        <div className="cp-table-scroll">
                            <table className="cp-table">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Mã thẻ</th>
                                        <th>Biển số</th>
                                        <th>Trạng thái</th>
                                        <th className="mc-th-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCards.length > 0 ? (
                                        paginatedCards.map((row, index) => (
                                            <tr key={row.code || index} className="mc-table-row">
                                                <td>{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</td>
                                                <td className="mc-td-bold">{row.code}</td>
                                                <td>{row.plate || '---'}</td>
                                                <td>
                                                    <span className={getStatusBadgeClass(row.status)}>{row.status}</span>
                                                </td>
                                                <td className="mc-td-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    {/* Nút Chỉnh sửa thông tin thẻ */}
                                                    <button type="button" className="mc-edit-btn"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                        onClick={() => handleEdit(row)} title="Chỉnh sửa"
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                                    </button>

                                                    {/* Nút Xóa thẻ (chỉ vô hiệu hóa/khóa khi thẻ ở trạng thái "Đang chờ") */}
                                                    <button type="button" className="mc-delete-btn"
                                                        style={{
                                                            color: '#ba1a1a',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: row.status !== 'Đang chờ' ? 'not-allowed' : 'pointer',
                                                            opacity: row.status !== 'Đang chờ' ? 0.4 : 1,
                                                        }}
                                                        onClick={() => handleDelete(row)}
                                                        disabled={row.status !== 'Đang chờ'}
                                                        title={row.status !== 'Đang chờ'
                                                            ? 'Chỉ có thể xóa thẻ ở trạng thái Đang chờ'
                                                            : 'Xóa thẻ'}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="mc-empty-row">Không tìm thấy thẻ phù hợp</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Thanh Chân Trang Phân Trang (Pagination Controls) */}
                        <div className="mc-pagination-footer">
                            <p className="mc-pagination-info">
                                Hiển thị {filteredCards.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCards.length)} của {filteredCards.length} kết quả
                            </p>
                            <div className="mc-pagination-controls">
                                <button className="mc-page-nav" disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                {getPageNumbers().map((page, i) =>
                                    page === '...' ? (
                                        <span key={`dots-${i}`} className="mc-page-dots">...</span>
                                    ) : (
                                        <button key={page}
                                            className={`mc-page-btn ${currentPage === page ? 'mc-page-btn-active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}
                                <button className="mc-page-nav" disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Modal Dialog Popup Đăng ký thẻ mới ── */}
            <CreateCardPageDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={async () => {
                    setIsCreateOpen(false);
                    setCurrentPage(1);
                    await fetchCards(1);
                }}
            />

            {/* ── Modal Dialog Popup Chỉnh sửa thông tin thẻ ── */}
            <EditCardPageDialog
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setEditingCard(null);
                }}
                card={editingCard}
                onSuccess={async () => {
                    setIsEditOpen(false);
                    setEditingCard(null);
                    await fetchCards();
                }}
            />

        </div>
    );
}