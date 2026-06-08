import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLostCards } from '../../../service/cardApi';

export default function LostCardLogPage() {
    const navigate = useNavigate();
    const [lostCards, setLostCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

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

    const handleFilter = () => {
        let filtered = lostCards.filter((row) => {
            const matchesSearch = 
                row.cardNo.toLowerCase().includes(search.toLowerCase()) || 
                row.plate.toLowerCase().includes(search.toLowerCase()) || 
                row.owner.toLowerCase().includes(search.toLowerCase()) || 
                row.id.toLowerCase().includes(search.toLowerCase());
            
            const matchesStatus = statusFilter === 'Tất cả' || row.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        setFilteredCards(filtered);
    };

    // Trigger filter when statusFilter changes or search is cleared
    useEffect(() => {
        handleFilter();
    }, [statusFilter, lostCards]);

    const renderPlate = (plateStr) => {
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

    const getStatusClass = (status) => {
        switch (status) {
            case 'Đang xử lý':
                return 'status-pending';
            case 'Đã hủy thẻ':
                return 'status-cancelled';
            case 'Đã tìm lại':
                return 'status-recovered';
            default:
                return '';
        }
    };

    // Dynamic stats
    const totalLost = lostCards.length;
    const resolved = lostCards.filter(c => c.status === 'Đã tìm lại' || c.status === 'Đã hủy thẻ').length;
    const pending = lostCards.filter(c => c.status === 'Đang xử lý').length;

    return (
        <div className="lost-card-log-page">
            {/* Header */}
            <header className="lost-header">
                <div className="lost-header-left">
                    <button type="button" className="lost-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1>Nhật ký xử lý mất thẻ</h1>
                </div>

                <div className="lost-header-right">
                    <button type="button" className="lost-bell-button" onClick={fetchLostCards}>
                        <span className="material-symbols-outlined">refresh</span>
                    </button>
                    <div className="lost-avatar">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                </div>
            </header>

            {/* Summary Cards */}
            <section className="lost-stats-grid">
                <article className="lost-stat-card">
                    <div className="lost-stat-content">
                        <p className="lost-stat-label">Tổng thẻ báo mất</p>
                        <p className="lost-stat-value">{loading ? '...' : totalLost}</p>
                        <p className="lost-stat-note positive">
                            <span className="material-symbols-outlined">trending_up</span>
                            +12% so với tháng trước
                        </p>
                    </div>
                    <div className="lost-stat-icon warning">
                        <span className="material-symbols-outlined">warning</span>
                    </div>
                </article>

                <article className="lost-stat-card">
                    <div className="lost-stat-content">
                        <p className="lost-stat-label">Đã xử lý xong</p>
                        <p className="lost-stat-value">{loading ? '...' : resolved}</p>
                        <div className="lost-stat-progress-bar">
                            <div className="progress-fill" style={{ width: totalLost > 0 ? `${(resolved / totalLost) * 100}%` : '0%' }}></div>
                        </div>
                    </div>
                    <div className="lost-stat-icon success">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                </article>

                <article className="lost-stat-card">
                    <div className="lost-stat-content">
                        <p className="lost-stat-label">Đang chờ xử lý</p>
                        <p className="lost-stat-value">{loading ? '...' : pending}</p>
                        <p className="lost-stat-note warning-note">
                            Cần xử lý trong 24h tới
                        </p>
                    </div>
                    <div className="lost-stat-icon pending">
                        <span className="material-symbols-outlined">assignment_late</span>
                    </div>
                </article>
            </section>

            {/* Filter Toolbar */}
            <section className="lost-toolbar">
                <div className="lost-filters">
                    <div className="lost-filter-group search-group">
                        <label>Tìm kiếm</label>
                        <div className="search-input-wrapper">
                            <span className="material-symbols-outlined">search</span>
                            <input 
                                type="text" 
                                placeholder="Tìm theo Mã thẻ hoặc Biển số..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            />
                        </div>
                    </div>

                    <div className="lost-filter-group dropdown-group">
                        <label>Trạng thái</label>
                        <select 
                            className="lost-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả</option>
                            <option value="Đang xử lý">Đang xử lý</option>
                            <option value="Đã hủy thẻ">Đã hủy thẻ</option>
                            <option value="Đã tìm lại">Đã tìm lại</option>
                        </select>
                    </div>

                    <div className="lost-filter-group date-group">
                        <label>Khoảng ngày</label>
                        <div className="date-input-wrapper">
                            <input type="text" value="01/10/2023 - 31/10/2023" readOnly />
                            <span className="material-symbols-outlined">calendar_today</span>
                        </div>
                    </div>

                    <button type="button" className="lost-filter-button" onClick={handleFilter}>
                        <span className="material-symbols-outlined">filter_list</span>
                        Lọc dữ liệu
                    </button>
                </div>
            </section>

            {/* Table */}
            <section className="lost-table-card">
                {error && (
                    <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        Đang tải nhật ký mất thẻ...
                    </div>
                ) : (
                    <>
                        <table className="lost-table">
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
                                        <tr key={row.id}>
                                            <td className="lost-id-cell">{row.id}</td>
                                            <td>{row.cardNo}</td>
                                            <td>{renderPlate(row.plate)}</td>
                                            <td>{row.owner}</td>
                                            <td>{row.date}</td>
                                            <td>
                                                <span className={`status-badge-lost ${getStatusClass(row.status)}`}>
                                                    <span className="dot"></span>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td>{row.handler}</td>
                                            <td>
                                                <button type="button" className="lost-action-btn">
                                                    <span className="material-symbols-outlined">edit</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            Không tìm thấy dữ liệu phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer / Pagination */}
                        <div className="lost-table-footer">
                            <span className="footer-info">Hiển thị {filteredCards.length} của {totalLost} báo cáo</span>
                            <div className="footer-right-actions">
                                <div className="lost-pagination">
                                    <button type="button" className="page-btn" disabled>
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button type="button" className="page-btn active">1</button>
                                    <button type="button" className="page-btn" disabled>
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                                <button type="button" className="lost-create-button">
                                    <span className="material-symbols-outlined">add</span>
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
