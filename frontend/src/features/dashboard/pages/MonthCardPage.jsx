import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMonthCards } from '../../../service/cardApi';

/**
 * MonthCardPage displays monthly card management interface.
 * Features stats, search, filters, and a detailed data table connected to Supabase.
 */

export default function MonthCardPage() {
    const navigate = useNavigate();
    const [monthCards, setMonthCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Search
    const [search, setSearch] = useState('');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('Tất cả loại xe');
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

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
    const filteredData = monthCards.filter((row) => {
        const matchesSearch =
            row.cardNo.toLowerCase().includes(search.toLowerCase()) ||
            row.plate.toLowerCase().includes(search.toLowerCase()) ||
            row.customer.toLowerCase().includes(search.toLowerCase());

        const matchesType =
            vehicleTypeFilter === 'Tất cả loại xe' ||
            row.type.toLowerCase().includes(vehicleTypeFilter.toLowerCase()) ||
            (vehicleTypeFilter === 'Ô tô' && row.type.toLowerCase().includes('ô tô')) ||
            (vehicleTypeFilter === 'Xe máy' && row.type.toLowerCase().includes('xe máy'));

        const matchesStatus =
            statusFilter === 'Tất cả trạng thái' ||
            row.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
    });

    // Dynamic stats
    const total = monthCards.length;
    const active = monthCards.filter(c => c.status === 'Hoạt động').length;
    const expiring = monthCards.filter(c => c.status === 'Sắp hết hạn').length;
    const expired = monthCards.filter(c => c.status === 'Đã hết hạn').length;

    const statCards = [
        { label: 'Tổng số vé', value: total, icon: 'card_membership', change: '+12%', changeType: 'positive' },
        { label: 'Đang hoạt động', value: active, icon: 'check_circle', change: total > 0 ? `${Math.round((active / total) * 100)}%` : '0%', changeType: 'positive' },
        { label: 'Sắp hết hạn', value: expiring, icon: 'warning', change: total > 0 ? `${Math.round((expiring / total) * 100)}%` : '0%', changeType: 'negative' },
        { label: 'Đã hết hạn', value: expired, icon: 'schedule', change: total > 0 ? `${Math.round((expired / total) * 100)}%` : '0%', changeType: 'neutral' },
    ];

    return (
        <div className="month-card-page">
            {/* 1. Header chuẩn hóa bám đỉnh, căn giữa tiêu đề hoàn toàn */}
            <header className="stats-top-bar">
                <div className="top-bar-left">
                    <button type="button" className="month-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Trở về Dashboard
                    </button>
                </div>

                <h1 className="stats-page-title">Quản lý Vé tháng</h1>

                <div className="top-bar-right">
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="bell-badge-dot"></span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">help</span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">settings</span>
                    </button>

                    <div className="header-user-profile">
                        <div className="profile-info-text">
                            <span className="profile-user-name">Admin User</span>
                            <span className="profile-user-role">SUPER ADMINISTRATOR</span>
                        </div>
                        <div className="profile-avatar-circle">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. Hàng Thống kê kết hợp 3 nút bấm (Chuyển thành Grid 5 cột như CSS mới) */}
            <div className="month-stats-grid-custom">
                {statCards.map((stat) => (
                    <div key={stat.label} className="month-stat-card">
                        <div className="stat-icon">
                            <span className="material-symbols-outlined">{stat.icon}</span>
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <p className="stat-value">{loading ? '...' : stat.value}</p>
                        </div>
                        <div className={`stat-change ${stat.changeType}`}>
                            {stat.change}
                        </div>
                    </div>
                ))}

                {/* Ô thứ 5: Chứa cụm 3 nút bấm chuyển đổi vị trí từ Header xuống */}
                <div className="month-inline-actions-card">
                    <button type="button" className="month-btn-inline" onClick={fetchMonthCards}>
                        <span className="material-symbols-outlined">refresh</span>
                        Làm mới
                    </button>
                    <button type="button" className="month-btn-inline">
                        <span className="material-symbols-outlined">calendar_today</span>
                        Gia hạn
                    </button>
                    <button type="button" className="month-btn-inline primary">
                        <span className="material-symbols-outlined">add</span>
                        Thêm mới
                    </button>
                </div>
            </div>

            {/* 3. Khu vực tìm kiếm và bộ lọc dữ liệu */}
            <div className="month-search-bar">
                <div className="search-input-wrapper">
                    <span className="material-symbols-outlined">search</span>
                    <input
                        type="text"
                        placeholder="Tìm theo biển số, tên chủ xe, số thẻ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-select-wrapper">
                    <select
                        value={vehicleTypeFilter}
                        onChange={(e) => setVehicleTypeFilter(e.target.value)}
                        className="month-filter-dropdown"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', marginRight: '10px' }}
                    >
                        <option value="Tất cả loại xe">Tất cả loại xe</option>
                        <option value="Xe máy">Xe máy</option>
                        <option value="Ô tô">Ô tô</option>
                    </select>
                </div>

                <div className="filter-select-wrapper">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="month-filter-dropdown"
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', marginRight: '10px' }}
                    >
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Sắp hết hạn">Sắp hết hạn</option>
                        <option value="Đã hết hạn">Đã hết hạn</option>
                    </select>
                </div>

                <button type="button" className="sort-download-btn" onClick={() => { setSearch(''); setVehicleTypeFilter('Tất cả loại xe'); setStatusFilter('Tất cả trạng thái'); }}>
                    <span className="material-symbols-outlined">restart_alt</span>
                </button>
                <button type="button" className="sort-download-btn">
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            {/* 4. Bảng danh sách dữ liệu */}
            <div className="month-table-container">
                {error && (
                    <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '45px', textAlign: 'center', color: '#888' }}>
                        Đang tải danh sách vé tháng...
                    </div>
                ) : (
                    <>
                        <table className="month-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>SỐ THẺ</th>
                                    <th>BIỂN SỐ</th>
                                    <th>TÊN KHÁCH HÀNG</th>
                                    <th>LOẠI XE</th>
                                    <th>NGÀY BẮT ĐẦU</th>
                                    <th>NGÀY HẾT HẠN</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? (
                                    filteredData.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.id}</td>
                                            <td>{row.cardNo}</td>
                                            <td>{row.plate}</td>
                                            <td>{row.customer}</td>
                                            <td>{row.type}</td>
                                            <td>{row.startDate}</td>
                                            <td>{row.endDate}</td>
                                            <td>
                                                <span className={`status-badge ${row.status === 'Hoạt động' ? 'active' : row.status === 'Sắp hết hạn' ? 'expiring' : 'expired'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button type="button" className="action-icon-btn">
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            Không tìm thấy vé tháng phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="month-pagination-footer">
                            <span className="pagination-info">Hiển thị {filteredData.length} trên tổng số {total} bản ghi</span>
                            <div className="month-pagination">
                                <button type="button" className="page-btn" disabled>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button type="button" className="page-btn active">1</button>
                                <button type="button" className="page-btn" disabled>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}