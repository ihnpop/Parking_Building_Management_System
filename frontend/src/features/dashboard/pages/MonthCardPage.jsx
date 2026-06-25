import { useState, useEffect, useMemo } from 'react';
import { getMonthCards } from '../../../service/monthCardApi';
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
    const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    const expiring = monthCards.filter(c => c.status === 'Sắp hết hạn').length;
    const expired = monthCards.filter(c => c.status === 'Đã hết hạn').length;

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
            case 'Sắp hết hạn': return 'mc-status-badge mc-status-expiring';
            case 'Đã hết hạn': return 'mc-status-badge mc-status-expired';
            default: return 'mc-status-badge mc-status-active';
        }
    };

    const handleReset = () => {
        setSearch('');
        setVehicleTypeFilter('Tất cả loại xe');
        setStatusFilter('Tất cả trạng thái');
    };

    return (
        <div className="mc-page">
            {/* Stats Row */}
            <div className="mc-stats-row">
                <div className="mc-stats-grid">
                    {/* Tổng số vé */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-primary">
                            <span className="material-symbols-outlined">confirmation_number</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Tổng số vé</p>
                            <p className="mc-stat-value">{loading ? '...' : total}</p>
                        </div>
                    </div>
                    {/* Đang hoạt động */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-secondary">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Đang hoạt động</p>
                            <p className="mc-stat-value">{loading ? '...' : active}</p>
                        </div>
                    </div>
                    {/* Sắp hết hạn */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-warning">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Sắp hết hạn</p>
                            <p className="mc-stat-value">{loading ? '...' : expiring}</p>
                        </div>
                    </div>
                    {/* Đã hết hạn */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-error">
                            <span className="material-symbols-outlined">schedule</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Hết hạn</p>
                            <p className="mc-stat-value">{loading ? '...' : expired}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thanh tìm kiếm và bộ lọc dữ liệu nhanh */}
            <div className="month-search-bar" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', flex: 1, background: '#fff' }}>
                    <span className="material-symbols-outlined" style={{ color: '#888', marginRight: '5px' }}>search</span>
                    <input
                        type="text"
                        placeholder="Tìm theo biển số, tên chủ xe..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%' }}
                    />
                </div>

                {/* Donut Chart */}
                <div className="mc-donut-card">
                    <h3 className="mc-donut-title">TỶ LỆ TRẠNG THÁI THẺ</h3>
                    <div className="mc-donut-wrapper">
                        <svg className="mc-donut-svg" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e1e1ee" strokeWidth="3" />
                            {/* Active */}
                            <circle cx="18" cy="18" r="15.915" fill="transparent"
                                stroke="#006d38"
                                strokeWidth="3"
                                strokeDasharray={`${activeStroke} ${circumference - activeStroke}`}
                                strokeDashoffset="25"
                            />
                            {/* Expiring */}
                            {expiringPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#d0c715ff"
                                    strokeWidth="3"
                                    strokeDasharray={`${expiringStroke} ${circumference - expiringStroke}`}
                                    strokeDashoffset={25 - activeStroke}
                                />
                            )}
                            {/* Expired */}
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
                            <span>Sắp hết hạn</span>
                        </div>
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-expired"></div>
                            <span>Hết hạn</span>
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
                        <option value="Sắp hết hạn">Sắp hết hạn</option>
                        <option value="Đã hết hạn">Đã hết hạn</option>
                    </select>
                </div>
                <div className="mc-action-buttons">
                    <button type="button" className="mc-btn mc-btn-outline" onClick={handleReset}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                        Làm mới
                    </button>
                    <button type="button" className="mc-btn mc-btn-outline" onClick={() => alert("Vui lòng chọn nút Gia hạn ở cột Thao tác của từng thẻ tháng trong danh sách bên dưới.")}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
                        Gia hạn
                    </button>
                    <button type="button" className="mc-btn mc-btn-primary" onClick={() => setIsCreateOpen(true)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Thêm mới

                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="mc-table-card">
                {error && (
                    <div className="mc-error-message">{error}</div>
                )}

                {loading ? (
                    <div className="mc-loading-message">Đang tải danh sách vé tháng...</div>
                ) : (
                    <>
                        <table className="month-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>STT</th>
                                    <th style={{ padding: '12px' }}>BIỂN SỐ</th>
                                    <th style={{ padding: '12px' }}>TÊN KHÁCH HÀNG</th>
                                    <th style={{ padding: '12px' }}>LOẠI XE</th>
                                    <th style={{ padding: '12px' }}>TRẠNG THÁI</th>
                                    <th style={{ padding: '12px' }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? (
                                    filteredData.map((row) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px' }}>{row.id}</td>
                                            <td style={{ padding: '12px' }}>{row.plate}</td>
                                            <td style={{ padding: '12px' }}>{row.customer}</td>
                                            <td style={{ padding: '12px' }}>{row.type}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span className={`status-badge ${row.status === 'Hoạt động' ? 'active' : 'expired'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                            Không tìm thấy vé tháng phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )
                }
            </div >

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
            <CreateMonthCardDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchMonthCards}
            />
        </div >
    );
}