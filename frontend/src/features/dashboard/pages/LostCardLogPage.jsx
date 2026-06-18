import React, { useState, useEffect } from 'react';
import { getLostCards } from '../../../service/cardApi';

export default function LostCardLogPage() {
    const [lostCards, setLostCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States dùng cho bộ lọc real-time tự động
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    // Nới rộng khoảng ngày mặc định từ năm 2023 đến 2026 để bao quát hết dữ liệu bãi xe
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState('2026-12-31');

    const fetchLostCards = async () => {
        try {
            setLoading(true);
            const data = await getLostCards();
            setLostCards(data);
            setFilteredCards(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching lost cards:", err);
            setError("Không thể tải nhật ký mất thẻ. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLostCards();
    }, []);

    // Tự động lọc Real-time ngay khi gõ hoặc thay đổi dữ liệu (Không cần bấm nút)
    useEffect(() => {
        let filtered = lostCards.filter((row) => {
            const cardNoStr = row.cardNo ? String(row.cardNo).toLowerCase() : '';
            const plateStr = row.plate ? String(row.plate).toLowerCase() : '';
            const ownerStr = row.owner ? String(row.owner).toLowerCase() : '';
            const idStr = row.id ? String(row.id).toLowerCase() : '';
            const searchStr = search.toLowerCase();

            const matchesSearch =
                cardNoStr.includes(searchStr) ||
                plateStr.includes(searchStr) ||
                ownerStr.includes(searchStr) ||
                idStr.includes(searchStr);

            const matchesStatus = statusFilter === 'Tất cả' || row.status === statusFilter;

            let matchesDate = true;
            if (row.date && startDate && endDate) {
                const rowDateStr = row.date.substring(0, 10);
                matchesDate = rowDateStr >= startDate && rowDateStr <= endDate;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
        setFilteredCards(filtered);
    }, [search, statusFilter, startDate, endDate, lostCards]);

    const renderPlate = (plateStr) => {
        if (!plateStr) return '---';
        const parts = plateStr.split('-');
        if (parts.length === 2) {
            return (
                <div className="lost-plate-box">
                    <div className="lost-plate-top">{parts[0]}</div>
                    <div className="lost-plate-bottom">{parts[1]}</div>
                </div>
            );
        }
        return <div className="lost-plate-box">{plateStr}</div>;
    };

    // Chuẩn hóa Class trạng thái để CSS nhận diện phân tách màu sắc
    const getStatusClass = (status) => {
        switch (status) {
            case 'Chờ xử lý':
            case 'Đang chờ xử lý': return 'status-pending-wait'; // Trạng thái Đỏ/Cam khẩn cấp
            case 'Đang xử lý': return 'status-pending';         // Trạng thái Xanh hồ thủy
            case 'Đã xử lý':
            case 'Đã xong':
            case 'Đã tìm lại': return 'status-recovered';       // Trạng thái Xanh lá hoàn thành
            case 'Đã hủy thẻ': return 'status-cancelled';
            default: return '';
        }
    };

    // --- Thống kê số liệu hệ thống bãi xe ---
    const totalLost = lostCards.length;
    const resolved = lostCards.filter(c => c.status === 'Đã tìm lại' || c.status === 'Đã hủy thẻ' || c.status === 'Đã xử lý' || c.status === 'Đã xong').length;
    const processing = lostCards.filter(c => c.status === 'Đang xử lý').length;
    const pending = lostCards.filter(c => c.status === 'Chờ xử lý' || c.status === 'Đang chờ xử lý').length;

    const pendingPercent = totalLost > 0 ? Math.round((pending / totalLost) * 100) : 0;
    const processingPercent = totalLost > 0 ? Math.round((processing / totalLost) * 100) : 0;
    const resolvedPercent = totalLost > 0 ? Math.round((resolved / totalLost) * 100) : 0;

    return (
        <div className="lost-card-log-page" style={{ width: '100%' }}>

            {/* Bảng phân tích Dashboard 2/3 và 1/3 */}
            <section className="lost-dashboard-analytics-container">

                {/* Lưới 4 ô chỉ số vuông bên trái */}
                <div className="lost-stats-grid-layout">
                    <article className="lost-stat-box-item total-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon total-icon">
                                <span className="material-symbols-outlined font-icon-modern">stacked_bar_chart</span>
                            </div>
                            <span className="lost-box-label">Tổng thẻ báo mất</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-total">{loading ? '...' : totalLost}</span>
                            <span className="lost-box-subtext">Hệ thống tổng hợp</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item pending-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon pending-icon">
                                <span className="material-symbols-outlined font-icon-modern">pending_actions</span>
                            </div>
                            <span className="lost-box-label">Đang chờ xử lý</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-pending">{loading ? '...' : pending}</span>
                            <span className="lost-box-subtext warning-alert">⚠️ Chờ tiếp nhận</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item processing-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon processing-icon">
                                <span className="material-symbols-outlined font-icon-modern">published_with_changes</span>
                            </div>
                            <span className="lost-box-label">Đang xử lý</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-processing">{loading ? '...' : processing}</span>
                            <span className="lost-box-subtext text-muted-smooth">🔍 Đối chiếu hình ảnh</span>
                        </div>
                    </article>

                    <article className="lost-stat-box-item success-border">
                        <div className="lost-box-header">
                            <div className="lost-box-icon success-icon">
                                <span className="material-symbols-outlined font-icon-modern">verified</span>
                            </div>
                            <span className="lost-box-label">Đã xong</span>
                        </div>
                        <div className="lost-box-body">
                            <span className="lost-box-number text-success">{loading ? '...' : resolved}</span>
                            <span className="lost-box-subtext success-alert">✅ Giải quyết xong</span>
                        </div>
                    </article>
                </div>

                {/* Khối biểu đồ tỉ lệ 1/3 bên phải */}
                <div className="lost-chart-visualization-card compressed-width">
                    <div className="chart-header-zone">
                        <span className="material-symbols-outlined text-muted">insights</span>
                        <h4>Tỷ lệ phân phối xử lý</h4>
                    </div>

                    <div className="chart-bars-wrapper">
                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Mốc tổng thẻ</span>
                                <span className="bar-data-counter"><b>{totalLost}</b> (100%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color total-fill" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Chờ xử lý</span>
                                <span className="bar-data-counter"><b>{pending}</b> ({pendingPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color pending-fill" style={{ width: `${pendingPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Đang xử lý</span>
                                <span className="bar-data-counter"><b>{processing}</b> ({processingPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color processing-fill" style={{ width: `${processingPercent}%` }}></div>
                            </div>
                        </div>

                        <div className="chart-bar-item">
                            <div className="bar-meta-desc">
                                <span className="bar-name-label">Đã xong</span>
                                <span className="bar-data-counter"><b>{resolved}</b> ({resolvedPercent}%)</span>
                            </div>
                            <div className="bar-track-background">
                                <div className="bar-fill-color success-fill" style={{ width: `${resolvedPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bộ lọc Toolbar (Tên class đồng bộ cao cấp) */}
            <section className="lost-toolbar-modern">
                <div className="lost-filters-horizontal-bar">

                    <div className="lost-filter-item search-premium-wrapper">
                        <label className="filter-field-label">Tìm kiếm nâng cao</label>
                        <div className="premium-input-box-styled">
                            <span className="material-symbols-outlined search-brand-icon-premium">search</span>
                            <input
                                type="text"
                                placeholder="Nhập mã báo mất, mã thẻ, biển số, chủ xe..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <span className="material-symbols-outlined clear-btn-premium" onClick={() => setSearch('')}>close</span>
                            )}
                        </div>
                    </div>

                    <div className="lost-filter-item select-premium-wrapper">
                        <label className="filter-field-label">Trạng thái xử lý</label>
                        <div className="premium-select-box-styled">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="Tất cả">Tất cả trạng thái</option>
                                <option value="Đang chờ xử lý">Đang chờ xử lý</option>
                                <option value="Đang xử lý">Đang xử lý</option>
                                <option value="Đã xử lý">Đã xong</option>
                            </select>
                            <span className="material-symbols-outlined select-arrow-icon-premium">keyboard_arrow_down</span>
                        </div>
                    </div>

                    <div className="lost-filter-item date-premium-wrapper">
                        <label className="filter-field-label">Khoảng ngày báo mất</label>
                        <div className="premium-date-inputs-styled">
                            <div className="date-field-node-premium">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <span className="date-range-split-dash-premium">đến</span>
                            <div className="date-field-node-premium">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Bảng hiển thị kết quả UI phẳng */}
            <section className="lost-table-card-premium">
                {error && <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Đang tải nhật ký bãi xe...</div>
                ) : (
                    <>
                        <div className="table-responsive-wrapper">
                            <table className="lost-table-modernized">
                                <thead>
                                    <tr>
                                        <th>MÃ BÁO MẤT</th>
                                        <th>MÃ THẺ</th>
                                        <th>BIỂN SỐ XE</th>
                                        <th>CHỦ XE</th>
                                        <th>NGÀY BÁO MẤT</th>
                                        <th>TRẠNG THÁI</th>
                                        <th>NGƯỜI XỬ LÝ</th>
                                        <th>THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCards.length > 0 ? (
                                        filteredCards.map((row) => (
                                            <tr key={row.id} className="row-animation-item">
                                                <td className="lost-id-cell-premium">{row.id}</td>
                                                <td style={{ fontWeight: '500' }}>{row.cardNo}</td>
                                                <td>{renderPlate(row.plate)}</td>
                                                <td>{row.owner}</td>
                                                <td className="text-muted-smooth">{row.date}</td>
                                                <td>
                                                    <span className={`status-badge-lost-premium ${getStatusClass(row.status)}`}>
                                                        {row.status === 'Đã xử lý' ? 'Đã xong' : row.status}
                                                    </span>
                                                </td>
                                                <td>{row.handler || '---'}</td>
                                                <td>
                                                    <button type="button" className="lost-action-btn-premium">
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                Không tìm thấy dữ liệu báo mất phù hợp trong khoảng ngày này
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer phân trang sang trọng đẩy sát về hai biên */}
                        <div className="lost-table-footer-premium">
                            <span className="footer-info-premium">Hiển thị <b>{filteredCards.length}</b> của <b>{totalLost}</b> báo cáo</span>
                            <div className="footer-right-actions-premium">
                                <div className="lost-pagination">
                                    <button type="button" className="page-btn" disabled>
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button type="button" className="page-btn active">1</button>
                                    <button type="button" className="page-btn" disabled>
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                                <button type="button" className="lost-create-button-premium">
                                    <span className="material-symbols-outlined icon-add-shift">add</span>
                                    Tạo báo mất mới
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}