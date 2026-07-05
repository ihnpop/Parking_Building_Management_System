import React, { useState, useEffect } from 'react';
import { getMonthCardLogs } from '../../../service/monthCardApi';

export default function MonthCardLogPage() {
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
            case 'Thành công': return 'status-recovered';    // Xanh lá hoàn thành
            case 'Đang xử lý': return 'status-pending';      // Xanh đại dương
            case 'Thất bại': return 'status-pending-wait';   // Đỏ cam khẩn cấp
            default: return '';
        }
    };

    const totalTransactions = allLogs.length;
    const renewals = allLogs.filter(log => log.type === 'Gia hạn' && log.status === 'Thành công').length;
    const newRegistrations = allLogs.filter(log => log.type === 'Cấp mới' && log.status === 'Thành công').length;
    const pendingCount = allLogs.filter(log => log.status === 'Đang xử lý').length;


    const failedCount = allLogs.filter(log => log.status === 'Thất bại').length;

    return (
        <div className="lost-card-log-wrapper">

            {/* ĐÃ XÓA KHỐI HEADER VÀ PROFILE LẶP LẠI TẠI ĐÂY */}

            {/* Stats Grid */}

            <div className="lost-kpi-container">
                <div className="lost-kpi-grid">
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <span className="lost-kpi-title">Tổng giao dịch</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{loading ? '...' : totalTransactions}</div>
                            <div className="lost-kpi-footer txt-gray">Tất cả giao dịch</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-green">
                                <span className="material-symbols-outlined">add_card</span>
                            </div>
                            <span className="lost-kpi-title">Đăng ký mới</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-green">{loading ? '...' : newRegistrations}</div>
                            <div className="lost-kpi-footer txt-green">Cấp mới thành công</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-blue">
                                <span className="material-symbols-outlined">autorenew</span>
                            </div>
                            <span className="lost-kpi-title">Gia hạn</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-blue">{loading ? '...' : renewals}</div>
                            <div className="lost-kpi-footer txt-blue">Gia hạn thành công</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-red">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                            <span className="lost-kpi-title">Đang chờ xử lý</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-red">{loading ? '...' : pendingCount}</div>
                            <div className="lost-kpi-footer txt-orange">Chờ xác nhận</div>
                        </div>
                    </div>
                </div>

                <div className="lost-dist-card">
                    <div className="lost-dist-title">
                        <span className="material-symbols-outlined">monitoring</span>
                        Tỷ lệ giao dịch
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Mốc tổng giao dịch</span>
                            <span><span className="lost-dist-val">{totalTransactions}</span> <span className="lost-dist-pct">(100%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-dark" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Cấp mới</span>
                            <span><span className="lost-dist-val">{newRegistrations}</span> <span className="lost-dist-pct">({totalTransactions > 0 ? Math.round((newRegistrations / totalTransactions) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-green" style={{ width: `${totalTransactions > 0 ? (newRegistrations / totalTransactions) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Gia hạn</span>
                            <span><span className="lost-dist-val">{renewals}</span> <span className="lost-dist-pct">({totalTransactions > 0 ? Math.round((renewals / totalTransactions) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-blue" style={{ width: `${totalTransactions > 0 ? (renewals / totalTransactions) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đang chờ xử lý</span>
                            <span><span className="lost-dist-val">{pendingCount}</span> <span className="lost-dist-pct">({totalTransactions > 0 ? Math.round((pendingCount / totalTransactions) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-gray" style={{ width: `${totalTransactions > 0 ? (pendingCount / totalTransactions) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Filter Toolbar */}

            {/* Filter Toolbar */}
            <div className="lost-filter-card">
                <div className="filter-block">
                    <label className="filter-label">TÌM KIẾM NÂNG CAO</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">search</span>
                        <input
                            type="text"
                            className="filter-input has-icon-left"
                            placeholder="Biển số, Chủ xe..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                        />
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">LOẠI GIAO DỊCH</label>
                    <div className="filter-input-wrapper">
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Gia hạn">Gia hạn</option>
                            <option value="Cấp mới">Cấp mới</option>
                            <option value="Thay đổi xe">Thay đổi xe</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">TRẠNG THÁI</label>
                    <div className="filter-input-wrapper">
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Thành công">Thành công</option>
                            <option value="Đang xử lý">Đang xử lý</option>
                            <option value="Thất bại">Thất bại</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>
            </div>


            {/* Bảng dữ liệu phẳng Flat UI */}
            <section className="lost-table-card-premium">
                {error && <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Đang tải nhật ký vé tháng...</div>
                ) : (
                    <>
                        <table className="month-log-table">
                            <thead>
                                <tr>
                                    <th>THỜI GIAN</th>
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
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Không tìm thấy nhật ký phù hợp</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="month-log-footer">
                            <span className="footer-info">Hiển thị {logs.length} trong số {totalTransactions} giao dịch</span>
                            <div className="month-log-pagination">
                                <button type="button" className="page-btn" disabled>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button type="button" className="page-btn active">1</button>
                                <button type="button" className="page-btn" disabled><span className="material-symbols-outlined">chevron_right</span></button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}