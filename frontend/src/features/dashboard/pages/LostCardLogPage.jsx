import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createLostCard } from "../../../service/cardApi"
export default function LostCardLogPage() {
    const navigate = useNavigate();
    const [lostCards, setLostCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');

    // Trạng thái hiển thị modal tạo báo mất thẻ
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Dữ liệu nhập vào của form báo mất thẻ mới
    const [newLostCard, setNewLostCard] = useState({
        plate_number: '',
        description: ''
    });

    // Xử lý gửi yêu cầu tạo báo mất thẻ mới lên server
    const handleCreateLostCard = async () => {
        try {
            // Tạo payload gửi đi từ dữ liệu form
            const payload = {
                plate_number: newLostCard.plate_number,
                description: newLostCard.description || 'Báo mất thẻ'
            };

            // Gọi API tạo báo mất thẻ mới
            await createLostCard(payload);
            // Tải lại danh sách nhật ký mất thẻ mới nhất
            await fetchLostCards();
            // Đóng modal và reset dữ liệu form về mặc định
            setShowCreateModal(false);
            setNewLostCard({
                plate_number: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            // Hiển thị thông báo lỗi chi tiết từ Server nếu có
            const message = err.response?.data?.message || err.message || 'Không thể tạo báo mất';
            alert(message);
        }
    };
    const fetchLostCards = async () => {
        try {
            setLoading(true);
            setError(null);

            // Gọi trực tiếp tới endpoint Backend của bạn
            const response = await axios.get('http://localhost:3636/api/cards/lost-card');
            const data = response.data.data || response.data;

            if (Array.isArray(data)) {
                setLostCards(data);
                setFilteredCards(data);
            } else {
                setLostCards([]);
                setFilteredCards([]);
            }
        } catch (err) {
            console.error("Error fetching lost cards:", err);
            setError("Không thể tải nhật ký mất thẻ. Vui lòng kiểm tra kết nối Backend!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLostCards();
    }, []);

    // Xử lý bộ lọc tìm kiếm và đồng bộ 3 trạng thái hiển thị
    const handleFilter = () => {
        let filtered = lostCards.filter((row) => {
            const cardCode = (row.card_code || row.cardNo || '').toLowerCase();
            const plateNumber = (row.plate_number || row.plate || '').toLowerCase();
            const customerName = (row.customer_name || row.owner || '').toLowerCase();
            const reportId = (row.lost_report_id || row.id || '').toLowerCase();
            const searchKey = search.toLowerCase();

            const matchesSearch =
                cardCode.includes(searchKey) ||
                plateNumber.includes(searchKey) ||
                customerName.includes(searchKey) ||
                reportId.includes(searchKey);

            // Đồng bộ chuỗi chữ trạng thái
            let currentStatus = row.status || 'Chờ xử lý';
            if (currentStatus === 'PENDING') currentStatus = 'Chờ xử lý';
            if (currentStatus === 'RESOLVED') currentStatus = 'Đã xong';

            const matchesStatus = statusFilter === 'Tất cả' || currentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
        setFilteredCards(filtered);
    };

    useEffect(() => {
        handleFilter();
    }, [statusFilter, search, lostCards]);

    const renderPlate = (plateStr) => {
        if (!plateStr || plateStr === "N/A" || plateStr === "Chưa có xe") {
            return <div className="lost-plate-box">---</div>;
        }
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

    // Chỉ định class màu CSS riêng biệt cho 3 trạng thái khác nhau
    // const getStatusClass = (status) => {
    //     if (status === 'Chờ xử lý' || status === 'PENDING') return 'status-pending'; // Màu vàng/cam cảnh báo
    //     if (status === 'Đang xử lý') return 'status-processing' || 'status-pending'; // Bạn có thể định nghĩa màu xanh dương trong CSS, hoặc dùng tạm màu vàng cam
    //     if (status === 'Đã xong' || status === 'RESOLVED') return 'status-recovered'; // Màu xanh lá hoàn thành
    //     return '';
    // };  

    const getStatusClass = (status) => {
        switch (status) {
            case 'Chờ xử lý':
                return 'status-pending';     /* Màu vàng cam */
            case 'Đang xử lý':
                return 'status-processing';  /* Màu xanh dương vừa thêm */
            case 'Đã xong':
            case 'Đã tìm lại':
                return 'status-recovered';   /* Màu xanh lá */
            case 'Đã hủy thẻ':
                return 'status-cancelled';
            default:
                return '';
        }
    };

    // Tính toán số liệu thống kê động chia đều cho 3 trạng thái
    const totalLost = lostCards.length;
    const pendingCount = lostCards.filter(c => c.status === 'Chờ xử lý' || c.status === 'PENDING').length;
    const processingCount = lostCards.filter(c => c.status === 'Đang xử lý').length;
    const resolvedCount = lostCards.filter(c => c.status === 'Đã xong' || c.status === 'RESOLVED').length;

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

            {/* Thống kê 3 trạng thái động */}
            <section className="lost-stats-grid">
                <article className="lost-stat-card">
                    <div className="lost-stat-content">
                        <p className="lost-stat-label">Chờ xử lý</p>
                        <p className="lost-stat-value" style={{ color: '#ff9800' }}>{loading ? '...' : pendingCount}</p>
                        <p className="lost-stat-note warning-note">Hệ thống vừa ghi nhận</p>
                    </div>
                    <div className="lost-stat-icon warning">
                        <span className="material-symbols-outlined">hourglass_empty</span>
                    </div>
                </article>

                <article className="lost-stat-card">
                    <div className="lost-stat-content">
                        <p className="lost-stat-label">Đang xử lý</p>
                        <p className="lost-stat-value" style={{ color: '#2196f3' }}>{loading ? '...' : processingCount}</p>
                        <p className="lost-stat-note" style={{ color: '#2196f3' }}>Nhân viên đang làm việc</p>
                    </div>
                    <div className="lost-stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#2196f3' }}>
                        <span className="material-symbols-outlined">sync</span>
                    </div>
                </article>

                <article className="lost-stat-card">
                    <div className="lost-stat-content">
                        <p className="lost-stat-label">Đã xong</p>
                        <p className="lost-stat-value" style={{ color: '#4caf50' }}>{loading ? '...' : resolvedCount}</p>
                        <div className="lost-stat-progress-bar">
                            <div className="progress-fill" style={{ width: totalLost > 0 ? `${(resolvedCount / totalLost) * 100}%` : '0%', backgroundColor: '#4caf50' }}></div>
                        </div>
                    </div>
                    <div className="lost-stat-icon success">
                        <span className="material-symbols-outlined">check_circle</span>
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
                            <option value="Tất cả">Tất cả (Tổng: {totalLost})</option>
                            <option value="Chờ xử lý">Chờ xử lý</option>
                            <option value="Đang xử lý">Đang xử lý</option>
                            <option value="Đã xong">Đã xong</option>
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
                                    <th>LOẠI THẺ</th>
                                    <th>NGÀY BÁO MẤT</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>NGƯỜI XỬ LÝ</th>
                                    <th>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCards.length > 0 ? (
                                    filteredCards.map((row) => {
                                        const reportId = row.lost_report_id || row.id;
                                        const cardCode = row.card_code || row.cardNo;
                                        const plateNumber = row.plate_number || row.plate;
                                        const cardType = row.card_type || 'Thẻ lượt';
                                        const reportDate = row.reported_at || row.date;

                                        return (
                                            <tr key={reportId}>
                                                <td className="lost-id-cell">{reportId}</td>
                                                <td>{cardCode}</td>
                                                <td>{renderPlate(plateNumber)}</td>
                                                <td>{cardType}</td>
                                                <td>
                                                    {reportDate && !isNaN(Date.parse(reportDate))
                                                        ? new Date(reportDate).toLocaleString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        })
                                                        : reportDate}
                                                </td>
                                                <td>
                                                    <span className={`status-badge-lost ${getStatusClass(row.status)}`}>
                                                        <span className="dot"></span>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td>{row.handler_name}</td>
                                                <td>
                                                    <button type="button" className="lost-action-btn">
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            Không tìm thấy dữ liệu phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer */}
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
                                <button type="button" className="lost-create-button" onClick={() => setShowCreateModal(true)}>
                                    <span className="material-symbols-outlined">add</span>
                                    Tạo báo mất mới
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
            {showCreateModal && (
                <div className="lost-modal-overlay">
                    <div className="lost-modal">

                        <h2>Tạo báo mất mới</h2>

                        <div className="lost-form-group">
                            <label>Biển số xe</label>
                            <input
                                type="text"
                                placeholder="Nhập biển số xe..."
                                value={newLostCard.plate_number}
                                onChange={(e) =>
                                    setNewLostCard({
                                        ...newLostCard,
                                        plate_number: e.target.value
                                    })
                                }
                            />
                        </div>

                        <div className="lost-form-group">
                            <label>Lí do</label>
                            <input
                                type="text"
                                placeholder="Nhập lí do báo mất..."
                                value={newLostCard.description}
                                onChange={(e) =>
                                    setNewLostCard({
                                        ...newLostCard,
                                        description: e.target.value
                                    })
                                }
                            />
                        </div>

                        <div className="lost-modal-actions">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Hủy
                            </button>

                            <button
                                type="button"
                                onClick={handleCreateLostCard}
                            >
                                Lưu
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}