import React, { useState, useEffect } from 'react';
import { getMonthCardLogs } from '../../../service/cardApi';

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
    const renewPercent = totalTransactions ? Math.round(renewals * 100 / totalTransactions) : 0;
    const newPercent = totalTransactions ? Math.round(newRegistrations * 100 / totalTransactions) : 0;
    const pendingPercent = totalTransactions ? Math.round(pendingCount * 100 / totalTransactions) : 0;
    const failedPercent = totalTransactions ? Math.round(failedCount * 100 / totalTransactions) : 0;

    return (
        <div className="lost-card-log-page" style={{ width: '100%' }}>

            {/* Bảng phân tích Dashboard KPIs 4 cột phẳng */}
            <section className="lost-dashboard-analytics-container">
                <div className="lost-stats-grid-layout" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>

                    <article className="lost-stat-box-item total-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon total-icon">
                                <span className="material-symbols-outlined font-icon-modern">directions_car</span>
                            </div>
                            <span className="lost-box-label">Tổng giao dịch</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-total">{loading ? '...' : totalTransactions}</span>
                            <span className="lost-box-subtext success-alert">📈 +5% hệ thống</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item success-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon success-icon">
                                <span className="material-symbols-outlined font-icon-modern">autorenew</span>
                            </div>
                            <span className="lost-box-label">Gia hạn thành công</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-success">{loading ? '...' : renewals}</span>
                            <span className="lost-box-subtext success-alert">✨ Tự động cập nhật</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item processing-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon processing-icon">
                                <span className="material-symbols-outlined font-icon-modern">add_card</span>
                            </div>
                            <span className="lost-box-label">Đăng ký mới</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-processing">{loading ? '...' : newRegistrations}</span>
                            <span className="lost-box-subtext success-alert">🚀 Cấp phát thẻ nhanh</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item pending-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon pending-icon">
                                <span className="material-symbols-outlined font-icon-modern">warning</span>
                            </div>
                            <span className="lost-box-label">Đang chờ xử lý</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-pending">{loading ? '...' : pendingCount}</span>
                            <span className="lost-box-subtext warning-alert">⏰ Cần đối soát nhanh</span>
                        </div>
                    </article>

                </div>

                {/* Khối biểu đồ tỉ lệ 1/3 bên phải */}
                <div className="lost-chart-visualization-card compressed-width">
                    <div className="chart-header-zone">
                        <span className="material-symbols-outlined text-muted">insights</span>
                        <h4>Tỷ lệ giao dịch vé tháng</h4>
                    </div>

                    <div className="chart-bars-wrapper">
                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Gia hạn thành công</span>
                                <span className="bar-data-counter"><b>{renewals}</b> ({renewPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color success-fill" style={{ width: `${renewPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Đăng ký mới</span>
                                <span className="bar-data-counter"><b>{newRegistrations}</b> ({newPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color processing-fill" style={{ width: `${newPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Đang chờ</span>
                                <span className="bar-data-counter"><b>{pendingCount}</b> ({pendingPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color pending-fill" style={{ width: `${pendingPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Thất bại</span>
                                <span className="bar-data-counter"><b>{failedCount}</b> ({failedPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color pending-warn-fill" style={{ width: `${failedPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Thanh công cụ tìm kiếm kết hợp ngang */}
            <section className="lost-toolbar-modern">
                <div className="lost-filters-horizontal-bar">

                    <div className="lost-filter-item search-premium-wrapper">
                        <label className="filter-field-label">Tìm kiếm nâng cao</label>
                        <div className="premium-input-box-styled">
                            <span className="material-symbols-outlined search-brand-icon-premium">search</span>
                            <input
                                type="text"
                                placeholder="Nhập biển số xe hoặc tên chủ xe để truy vết..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            />
                        </div>
                    </div>

                    <div className="lost-filter-item select-premium-wrapper">
                        <label className="filter-field-label">Loại giao dịch</label>
                        <div className="premium-select-box-styled">
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                <option value="Tất cả">Tất cả danh mục</option>
                                <option value="Gia hạn">Gia hạn vé</option>
                                <option value="Cấp mới">Cấp mới thẻ</option>
                                <option value="Thay đổi xe">Thay đổi xe</option>
                            </select>
                            <span className="material-symbols-outlined select-arrow-icon-premium">keyboard_arrow_down</span>
                        </div>
                    </div>

                    <div className="lost-filter-item select-premium-wrapper">
                        <label className="filter-field-label">Trạng thái đối soát</label>
                        <div className="premium-select-box-styled">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="Tất cả">Tất cả trạng thái</option>
                                <option value="Thành công">Thành công</option>
                                <option value="Đang xử lý">Đang xử lý</option>
                                <option value="Thất bại">Thất bại</option>
                            </select>
                            <span className="material-symbols-outlined select-arrow-icon-premium">keyboard_arrow_down</span>
                        </div>
                    </div>

                    <button type="button" className="lost-create-button-premium" onClick={handleFilter} style={{ height: '42px' }}>
                        <span className="material-symbols-outlined">filter_list</span>
                        Lọc dữ liệu
                    </button>

                </div>
            </section>

            {/* Bảng dữ liệu phẳng Flat UI */}
            <section className="lost-table-card-premium">
                {error && <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Đang tải nhật ký vé tháng...</div>
                ) : (
                    <>
                        <div className="table-responsive-wrapper">
                            <table className="lost-table-modernized">
                                <thead>
                                    <tr>
                                        <th>THỜI GIAN GIAO DỊCH</th>
                                        <th>BIỂN SỐ</th>
                                        <th>CHỦ XE</th>
                                        <th>LOẠI GD</th>
                                        <th>SỐ TIỀN THANH TOÁN</th>
                                        <th>TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length > 0 ? (
                                        logs.map((log, index) => (
                                            <tr key={index} className="row-animation-item">
                                                <td className="text-muted-smooth" style={{ fontFamily: 'monospace' }}>{log.time}</td>
                                                <td style={{ fontWeight: '700', color: '#1f2937' }}>{log.plate}</td>
                                                <td>{log.owner}</td>
                                                <td>
                                                    <span style={{ fontWeight: '600', color: log.type === 'Cấp mới' ? '#0284c7' : '#475569' }}>
                                                        {log.type}
                                                    </span>
                                                </td>
                                                <td className="lost-id-cell-premium" style={{ fontWeight: '700' }}>{log.amount}</td>
                                                <td>
                                                    <span className={`status-badge-lost-premium ${getStatusClass(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                Không tìm thấy nhật ký gia dịch phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer phân trang kịch biên */}
                        <div className="lost-table-footer-premium">
                            <span className="footer-info-premium">Hiển thị <b>{logs.length}</b> trong số <b>{totalTransactions}</b> giao dịch</span>
                            <div className="lost-pagination">
                                <button type="button" className="page-btn" disabled><span className="material-symbols-outlined">chevron_left</span></button>
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