import { useState, useEffect, useMemo } from 'react';
import { getMonthCards, deleteMonthCard } from '../../../service/monthCardApi';
import RenewCardDialog from '../components/RenewCardDialog';
import EditMonthCardDialog from '../components/EditMonthCardDialog';
import CreateMonthCardDialog from '../components/CreateMonthCardDialog';


const ITEMS_PER_PAGE = 8;

export default function MonthCardPage() {
    const [monthCards, setMonthCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [renewingCard, setRenewingCard] = useState(null);
    const [editingCard, setEditingCard] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false); // Trạng thái mở modal eKYC tổng


    // Filters & Search
    const [search, setSearch] = useState('');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('Tất cả loại xe');
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    const fetchMonthCards = async () => {
        try {
            setLoading(true);
            const data = await getMonthCards();
            setMonthCards(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching monthly cards:", err);
            setError("Không thể tải danh sách vé tháng. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = "Quản lý vé tháng | Parking Building Management System";
        fetchMonthCards();
    }, []);

    // Filter Logic
    const filteredData = useMemo(() => {
        return monthCards.filter((row) => {
            const matchesSearch =
                (row.cardNo || '').toLowerCase().includes(search.toLowerCase()) ||
                (row.plate || '').toLowerCase().includes(search.toLowerCase()) ||
                (row.customer || '').toLowerCase().includes(search.toLowerCase());

            const matchesType =
                vehicleTypeFilter === 'Tất cả loại xe' ||
                (row.type || '').toLowerCase().includes(vehicleTypeFilter.toLowerCase()) ||
                (vehicleTypeFilter === 'Ô tô' && (row.type || '').toLowerCase().includes('ô tô')) ||
                (vehicleTypeFilter === 'Xe máy' && (row.type || '').toLowerCase().includes('xe máy'));

            const matchesStatus = statusFilter === 'Tất cả trạng thái' || row.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [monthCards, search, vehicleTypeFilter, statusFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, vehicleTypeFilter, statusFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
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
    const total = monthCards.length;
    const active = monthCards.filter(c => c.status === 'Hoạt động').length;
    const expiring = monthCards.filter(c => c.status === 'Đang chờ').length;
    const expired = monthCards.filter(c => c.status === 'Đã khóa').length;

    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const expiringPercent = total > 0 ? Math.round((expiring / total) * 100) : 0;
    const expiredPercent = total > 0 ? Math.round((expired / total) * 100) : 0;

    // SVG donut chart calculation
    const circumference = 2 * Math.PI * 15.915;
    const activeStroke = (activePercent / 100) * circumference;
    const expiringStroke = (expiringPercent / 100) * circumference;
    const expiredStroke = (expiredPercent / 100) * circumference;

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Hoạt động': return 'mc-status-badge mc-status-active';
            case 'Đang chờ': return 'mc-status-badge mc-status-expiring';
            case 'Đã khóa': return 'mc-status-badge mc-status-expired';
            default: return 'mc-status-badge mc-status-active';
        }
    };

    const handleReset = () => {
        setSearch('');
        setVehicleTypeFilter('Tất cả loại xe');
        setStatusFilter('Tất cả trạng thái');
    };

    // ── Trạng thái xóa thẻ tháng ──────────────────────────────────────────────
    const [deletingCard, setDeletingCard] = useState(null);   // Thẻ đang được chọn để xóa (null = không hiện modal)
    const [isDeleting, setIsDeleting] = useState(false);      // Khóa nút trong khi đang gửi request xóa
    const [deleteError, setDeleteError] = useState(null);     // Lưu thông báo lỗi riêng cho modal xóa

    // ── Toast thông báo kết quả (dùng chung cho mọi hành động) ─────────────────
    // state lưu nội dung & loại toast (success | error)
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Hiện toast trong 3 giây rồi tự ẩn
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // ── Xử lý xác nhận xóa thẻ tháng ──────────────────────────────────────────
    const handleDelete = async () => {
        if (!deletingCard) return; // Bảo vệ: không làm gì nếu chưa chọn thẻ
        try {
            setIsDeleting(true);
            setDeleteError(null);

            // Gọi API xóa mềm: cập nhật deleted_at + status → "Đã khóa"
            await deleteMonthCard(deletingCard.card_id);

            setDeletingCard(null);  // Đóng modal xác nhận
            showToast(`Xóa thẻ ${deletingCard.cardNo} thành công!`, 'success'); // Hiện toast xanh
            fetchMonthCards(); // Tải lại danh sách để phản ánh thay đổi
        } catch (err) {
            console.error("Error deleting month card:", err);
            // Ưu tiên lấy message từ response của server, fallback về err.message
            setDeleteError(err.response?.data?.message || err.message || "Xóa vé tháng thất bại. Vui lòng thử lại!");
        } finally {
            setIsDeleting(false); // Luôn mở khóa nút dù thành công hay thất bại
        }
    };

    // Đóng modal xác nhận xóa và reset lỗi (tránh lỗi cũ hiện lại lần sau)
    const closeDeleteModal = () => {
        setDeletingCard(null);
        setDeleteError(null);
    };

    return (
        <div className="mc-page">
            {/* Stats Row */}
            <div className="mc-stats-row">
                <div className="mc-stats-grid">
                    {/* Tổng số vé */}
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
                    {/* Đang hoạt động */}
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
                    {/* Đã khóa */}
                    <div className="mc-stat-card mc-stat-danger">
                        <div className="mc-stat-card-header">
                            <div className="mc-stat-icon">
                                <span className="material-symbols-outlined">gpp_bad</span>
                            </div>
                            <span className="mc-stat-badge">Đã khóa</span>
                        </div>
                        <div className="mc-stat-body">
                            <p className="mc-stat-value">{loading ? '...' : expired}</p>
                            <p className="mc-stat-label">Đã khóa</p>
                        </div>
                    </div>
                    {/* Đang chờ */}
                    <div className="mc-stat-card mc-stat-warning">
                        <div className="mc-stat-card-header">
                            <div className="mc-stat-icon">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <span className="mc-stat-badge">Đang chờ</span>
                        </div>
                        <div className="mc-stat-body">
                            <p className="mc-stat-value">{loading ? '...' : expiring}</p>
                            <p className="mc-stat-label">Thẻ đang chờ</p>
                        </div>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="mc-donut-card">
                    <h3 className="mc-donut-title">TỶ LỆ TRẠNG THÁI THẺ</h3>
                    <div className="mc-donut-wrapper">
                        <svg className="mc-donut-svg" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e1e1ee" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.915" fill="transparent"
                                stroke="#006d38"
                                strokeWidth="3"
                                strokeDasharray={`${activeStroke} ${circumference - activeStroke}`}
                                strokeDashoffset="25"
                            />
                            {expiringPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#d0c715ff"
                                    strokeWidth="3"
                                    strokeDasharray={`${expiringStroke} ${circumference - expiringStroke}`}
                                    strokeDashoffset={25 - activeStroke}
                                />
                            )}
                            {expiredPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#ba1a1a"
                                    strokeWidth="3"
                                    strokeDasharray={`${expiredStroke} ${circumference - expiredStroke}`}
                                    strokeDashoffset={25 - activeStroke - expiringStroke}
                                />
                            )}
                        </svg>
                        <div className="mc-donut-center">
                            <span className="mc-donut-percent">{loading ? '...' : `${activePercent}%`}</span>
                            <span className="mc-donut-sub">Hoạt động</span>
                        </div>
                    </div>
                    <div className="mc-donut-legend">
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-active"></div>
                            <span>Hoạt động</span>
                        </div>
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-expiring"></div>
                            <span>Đang chờ</span>
                        </div>
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-expired"></div>
                            <span>Đã khóa</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mc-action-bar">
                <div className="mc-filters">
                    <div className="mc-search-wrapper">
                        <span className="material-symbols-outlined mc-search-icon">search</span>
                        <input
                            type="text"
                            className="mc-search-input"
                            placeholder="Tìm theo biển số, tên chủ xe, số thẻ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="mc-filter-select"
                        value={vehicleTypeFilter}
                        onChange={(e) => setVehicleTypeFilter(e.target.value)}
                    >
                        <option value="Tất cả loại xe">Tất cả loại xe</option>
                        <option value="Xe máy">Xe máy</option>
                        <option value="Ô tô">Ô tô</option>
                    </select>
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
                    <button type="button" className="mc-btn mc-btn-outline" onClick={handleReset}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                        Làm mới
                    </button>

                    {/* Cập nhật sự kiện click kích hoạt Luồng Tạo Mới kèm eKYC */}
                    <button type="button" className="mc-btn mc-btn-primary" onClick={() => setIsCreateOpen(true)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Đăng ký vé tháng

                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="mc-table-card">
                {error && <div className="mc-error-message">{error}</div>}

                {loading ? (
                    <div className="mc-loading-message">Đang tải danh sách vé tháng...</div>
                ) : (
                    <>
                        <div className="mc-table-scroll">
                            <table className="mc-table">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Số thẻ</th>
                                        <th>Biển số</th>
                                        <th>Tên khách hàng</th>
                                        <th>Loại xe</th>
                                        <th>Ngày bắt đầu</th>
                                        <th>Ngày hết hạn</th>
                                        <th>Trạng thái</th>
                                        <th className="mc-th-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((row, index) => (
                                            <tr key={row.id || index} className="mc-table-row">
                                                <td>{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</td>
                                                <td className="mc-td-bold">{row.cardNo}</td>
                                                <td>{row.plate || '---'}</td>
                                                <td>{row.customer || '---'}</td>
                                                <td>{row.type || '---'}</td>
                                                <td>{row.startDate || 'Chưa có'}</td>
                                                <td>{row.endDate || 'Không giới hạn'}</td>
                                                <td>
                                                    <span className={getStatusBadgeClass(row.status)}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="mc-td-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="mc-edit-btn"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                        title="Chỉnh sửa"
                                                        onClick={() => setEditingCard(row)}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mc-renew-btn"
                                                        style={{ color: '#004bca', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        title="Gia hạn"
                                                        onClick={() => setRenewingCard(row)}
                                                        disabled={!row.registrationId || row.status === 'Đã khóa'}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
                                                    </button>
                                                    {/* Nút xóa thẻ - chỉ cho phép xóa khi thẻ KHÔNG ở trạng thái "Hoạt động" */}
                                                    <button type="button" className="cp-delete-btn"
                                                        style={{
                                                            color: '#ba1a1a',
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: row.status === 'Hoạt động' ? 'not-allowed' : 'pointer',
                                                            opacity: row.status === 'Hoạt động' ? 0.4 : 1,
                                                        }}
                                                        onClick={() => {
                                                            if (row.status === 'Hoạt động') return;
                                                            setDeletingCard(row);
                                                        }}
                                                        disabled={row.status === 'Hoạt động'}
                                                        title={row.status === 'Hoạt động' ? 'Không thể xóa thẻ đang hoạt động' : 'Xóa thẻ'}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="mc-empty-row">
                                                Không tìm thấy vé tháng phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="mc-pagination-footer">
                            <p className="mc-pagination-info">
                                Hiển thị {filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} của {filteredData.length} kết quả
                            </p>
                            <div className="mc-pagination-controls">
                                <button
                                    className="mc-page-nav"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                {getPageNumbers().map((page, i) => (
                                    page === '...' ? (
                                        <span key={`dots-${i}`} className="mc-page-dots">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            className={`mc-page-btn ${currentPage === page ? 'mc-page-btn-active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    )
                                ))}
                                <button
                                    className="mc-page-nav"
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

            {/* COMPONENT DIALOG TẠO MỚI THEO LUỒNG EKYC ĐÃ BỔ SUNG */}
            <CreateMonthCardDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    fetchMonthCards(); // Tải lại bảng dữ liệu sau khi tạo thành công
                }}
            />

            <RenewCardDialog
                isOpen={!!renewingCard}
                onClose={() => setRenewingCard(null)}
                cardData={renewingCard}
                onSuccess={fetchMonthCards}
            />
            <EditMonthCardDialog
                isOpen={!!editingCard}
                onClose={() => setEditingCard(null)}
                cardData={editingCard}
                onSuccess={fetchMonthCards}
            />

            {deletingCard && (
                <div className="mc-confirm-overlay">
                    <div className="mc-confirm-box">
                        <p>Bạn chắc chắn muốn xóa thẻ <b>{deletingCard.cardNo}</b>?</p>
                        <p style={{ fontSize: '13px', color: '#999' }}>
                            Thẻ sẽ chuyển sang trạng thái "Đã khóa" và ẩn khỏi danh sách.
                        </p>

                        {deleteError && (
                            <p style={{ color: '#ff6b6b', fontSize: '13px', marginTop: '8px' }}>
                                {deleteError}
                            </p>
                        )}

                        <div className="mc-confirm-actions">
                            <button onClick={closeDeleteModal} disabled={isDeleting}>Hủy</button>
                            <button onClick={handleDelete} disabled={isDeleting} className="mc-btn-danger">
                                {isDeleting ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast thông báo kết quả (hiện 3 giây rồi tự ẩn) ── */}
            {/* Dùng class CSS `custom-toast success` hoặc `custom-toast error` để đổi màu */}
            {toast.show && (
                <div className={`custom-toast ${toast.type}`}>
                    {/* Icon: check_circle khi thành công, error khi thất bại */}
                    <span className="material-symbols-outlined">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span className="toast-text">{toast.message}</span>
                </div>
            )}
        </div>
    );
}