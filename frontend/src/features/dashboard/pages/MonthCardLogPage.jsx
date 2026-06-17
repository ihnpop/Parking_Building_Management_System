import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthCardLogs } from '../../../service/cardApi';

export default function MonthCardLogPage() {
    const navigate = useNavigate();
    const [allLogs, setAllLogs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Tất cả');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await getMonthCardLogs();
            setAllLogs(data);
            setLogs(data);
            setError(null);
        } catch (err) {
            console.error("Error loading month card logs:", err);
            setError("Không thể tải nhật ký giao dịch vé tháng. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleFilter = () => {
        let filtered = allLogs.filter((log) => {
            const matchesSearch = 
                log.cardNo.toLowerCase().includes(search.toLowerCase()) || 
                log.plate.toLowerCase().includes(search.toLowerCase()) || 
                log.owner.toLowerCase().includes(search.toLowerCase());
            
            const matchesType = typeFilter === 'Tất cả' || log.type === typeFilter;
            const matchesStatus = statusFilter === 'Tất cả' || log.status === statusFilter;
            
            return matchesSearch && matchesType && matchesStatus;
        });
        setLogs(filtered);
    };

    useEffect(() => {
        handleFilter();
    }, [typeFilter, statusFilter, allLogs]);

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

    // Calculate live stats
    const totalTransactions = allLogs.length;
    const renewals = allLogs.filter(log => log.type === 'Gia hạn' && log.status === 'Thành công').length;
    const newRegistrations = allLogs.filter(log => log.type === 'Cấp mới' && log.status === 'Thành công').length;
    const pendingCount = allLogs.filter(log => log.status === 'Đang xử lý').length;

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
                    <button type="button" className="month-log-bell-btn" onClick={fetchLogs}>
                        <span className="material-symbols-outlined">refresh</span>
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
                        <p className="stat-label">Tổng giao dịch</p>
                        <p className="stat-value">{loading ? '...' : totalTransactions}</p>
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
                        <p className="stat-label">Đã gia hạn thành công</p>
                        <p className="stat-value">{loading ? '...' : renewals}</p>
                    </div>
                </article>

                <article className="month-log-stat-card">
                    <div className="card-header">
                        <div className="stat-icon-wrapper new-card">
                            <span className="material-symbols-outlined">add_card</span>
                        </div>
                    </div>
                    <div className="card-body">
                        <p className="stat-label">Đăng ký mới thành công</p>
                        <p className="stat-value">{loading ? '...' : newRegistrations}</p>
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
                        <p className="stat-label">Đang chờ xử lý</p>
                        <p className="stat-value">{loading ? '...' : pendingCount}</p>
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
                        <label>Loại giao dịch</label>
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
                {error && (
                    <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        Đang tải nhật ký vé tháng...
                    </div>
                ) : (
                    <>
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
                            <span className="footer-info">Hiển thị {logs.length} trong số {totalTransactions} giao dịch</span>
                            <div className="month-log-pagination">
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
            </section>
        </div>
    );
}
