import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialLogs = [
    { time: '20/10/2023 14:30', cardNo: 'V00124', plate: '29A-123.45', owner: 'Nguyễn Văn A', type: 'Gia hạn', amount: '1,200,000đ', status: 'Thành công' },
    { time: '20/10/2023 10:15', cardNo: 'V00125', plate: '30F-987.65', owner: 'Trần Thị B', type: 'Cấp mới', amount: '1,500,000đ', status: 'Thành công' },
    { time: '19/10/2023 16:45', cardNo: 'V00098', plate: '51H-555.22', owner: 'Lê Văn C', type: 'Thay đổi xe', amount: '0đ', status: 'Đang xử lý' },
    { time: '19/10/2023 09:20', cardNo: 'V00112', plate: '15A-333.44', owner: 'Phạm Đức D', type: 'Gia hạn', amount: '1,200,000đ', status: 'Thất bại' },
];

export default function MonthCardLogPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Tất cả');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [logs, setLogs] = useState(initialLogs);

    const handleFilter = () => {
        let filtered = initialLogs.filter((log) => {
            const matchesSearch = log.cardNo.toLowerCase().includes(search.toLowerCase()) || 
                                  log.plate.toLowerCase().includes(search.toLowerCase()) || 
                                  log.owner.toLowerCase().includes(search.toLowerCase());
            
            const matchesType = typeFilter === 'Tất cả' || log.type === typeFilter;
            const matchesStatus = statusFilter === 'Tất cả' || log.status === statusFilter;
            
            return matchesSearch && matchesType && matchesStatus;
        });
        setLogs(filtered);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Thành công':
                return 'status-success';
            case 'Đang xử lý':
                return 'status-processing';
            case 'Thất bại':
                return 'status-failed';
            default:
                return '';
        }
    };

    return (
        <div className="month-log-page">
            {/* Header */}
            <header className="month-log-header">
                <div className="month-log-header-left">
                    <button type="button" className="month-log-back-btn" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1>Nhật ký vé tháng</h1>
                </div>

                <div className="month-log-header-right">
                    <button type="button" className="month-log-bell-btn">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="month-log-profile">
                        <div className="profile-text">
                            <span className="profile-name">Admin User</span>
                            <span className="profile-role">Quản trị viên</span>
                        </div>
                        <div className="profile-avatar">AD</div>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="month-log-stats-grid">
                <article className="month-log-stat-card">
                    <div className="card-header">
                        <div className="stat-icon-wrapper active-card">
                            <span className="material-symbols-outlined">directions_car</span>
                        </div>
                        <span className="badge-percent">+5%</span>
                    </div>
                    <div className="card-body">
                        <p className="stat-label">Vé đang hoạt động</p>
                        <p className="stat-value">1,248</p>
                    </div>
                </article>

                <article className="month-log-stat-card">
                    <div className="card-header">
                        <div className="stat-icon-wrapper renew-card">
                            <span className="material-symbols-outlined">autorenew</span>
                        </div>
                        <span className="badge-percent">+12%</span>
                    </div>
                    <div className="card-body">
                        <p className="stat-label">Đã gia hạn tháng này</p>
                        <p className="stat-value">452</p>
                    </div>
                </article>

                <article className="month-log-stat-card">
                    <div className="card-header">
                        <div className="stat-icon-wrapper new-card">
                            <span className="material-symbols-outlined">add_card</span>
                        </div>
                    </div>
                    <div className="card-body">
                        <p className="stat-label">Đăng ký mới</p>
                        <p className="stat-value">86</p>
                    </div>
                </article>

                <article className="month-log-stat-card">
                    <div className="card-header">
                        <div className="stat-icon-wrapper alert-card">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <span className="badge-text-alert">Cần chú ý</span>
                    </div>
                    <div className="card-body">
                        <p className="stat-label">Sắp hết hạn (7 ngày)</p>
                        <p className="stat-value">124</p>
                    </div>
                </article>
            </section>

            {/* Filter Toolbar */}
            <section className="month-log-toolbar">
                <h2>Bộ lọc tìm kiếm</h2>
                <div className="month-log-filters">
                    <div className="filter-group search-group">
                        <label>Tìm kiếm</label>
                        <div className="search-wrapper">
                            <span className="material-symbols-outlined">search</span>
                            <input 
                                type="text" 
                                placeholder="Mã thẻ, Biển số, Chủ xe..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            />
                        </div>
                    </div>

                    <div className="filter-group select-group">
                        <label>Loại xe</label>
                        <select 
                            value={typeFilter} 
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="month-log-select"
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Gia hạn">Gia hạn</option>
                            <option value="Cấp mới">Cấp mới</option>
                            <option value="Thay đổi xe">Thay đổi xe</option>
                        </select>
                    </div>

                    <div className="filter-group select-group">
                        <label>Trạng thái</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="month-log-select"
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Thành công">Thành công</option>
                            <option value="Đang xử lý">Đang xử lý</option>
                            <option value="Thất bại">Thất bại</option>
                        </select>
                    </div>

                    <button type="button" className="month-log-filter-btn" onClick={handleFilter}>
                        <span className="material-symbols-outlined">filter_list</span>
                        Lọc dữ liệu
                    </button>
                </div>
            </section>

            {/* Table */}
            <section className="month-log-table-card">
                <table className="month-log-table">
                    <thead>
                        <tr>
                            <th>THỜI GIAN</th>
                            <th>MÃ THẺ</th>
                            <th>BIỂN SỐ</th>
                            <th>CHỦ XE</th>
                            <th>LOẠI GD</th>
                            <th>SỐ TIỀN</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map((log, index) => (
                                <tr key={index}>
                                    <td className="log-time">{log.time}</td>
                                    <td className="log-card-no">{log.cardNo}</td>
                                    <td>{log.plate}</td>
                                    <td>{log.owner}</td>
                                    <td>{log.type}</td>
                                    <td className="log-amount">{log.amount}</td>
                                    <td>
                                        <span className={`status-badge-month ${getStatusClass(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                    Không tìm thấy nhật ký phù hợp
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Footer / Pagination */}
                <div className="month-log-footer">
                    <span className="footer-info">Hiển thị 1 - {logs.length} trong số 452</span>
                    <div className="month-log-pagination">
                        <button type="button" className="page-btn">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button type="button" className="page-btn active">1</button>
                        <button type="button" className="page-btn">2</button>
                        <button type="button" className="page-btn">3</button>
                        <span className="pagination-dots">...</span>
                        <button type="button" className="page-btn">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
