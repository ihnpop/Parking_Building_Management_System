import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createLostCard } from "../../../service/cardApi";

export default function LostCardLogPage() {
    const navigate = useNavigate();
    const [lostCards, setLostCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States dùng cho bộ lọc
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Trạng thái hiển thị modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCard, setEditingCard] = useState(null);

    // Dữ liệu nhập vào của form báo mất thẻ mới
    const [newLostCard, setNewLostCard] = useState({
        plate_number: '',
        description: ''
    });

    const fetchLostCards = async () => {
        try {
            setLoading(true);
            setError(null);
            // const response = await axios.get('http://localhost:3636/api/cards/lost-card'); đổi dòng này*********
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/cards/lost-card`);
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

    const handleUpdateLostCard = async () => {
        try {
            // Tạm thời update local state
            setLostCards(prev => prev.map(card =>
                (card.lost_report_id === editingCard.lost_report_id || card.id === editingCard.id)
                    ? { ...card, ...editingCard } : card
            ));
            setFilteredCards(prev => prev.map(card =>
                (card.lost_report_id === editingCard.lost_report_id || card.id === editingCard.id)
                    ? { ...card, ...editingCard } : card
            ));

            alert('Đã lưu thay đổi thành công!');
            setEditingCard(null);
        } catch (err) {
            console.error(err);
            alert('Lỗi khi lưu thay đổi!');
        }
    };

    const handleCreateLostCard = async () => {
        try {
            const payload = {
                plate_number: newLostCard.plate_number,
                description: newLostCard.description || 'Báo mất thẻ'
            };

            await createLostCard(payload);
            await fetchLostCards();
            setShowCreateModal(false);
            setNewLostCard({
                plate_number: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            const message = err.response?.data?.message || err.message || 'Không thể tạo báo mất';
            alert(message);
        }
    };

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

            const currentStatus = row.status || 'Chờ xử lý';
            const matchesStatus = statusFilter === 'Tất cả' || currentStatus === statusFilter;

            let matchesDate = true;
            if (startDate || endDate) {
                const rowDateStr = row.reported_at || row.date;
                if (rowDateStr) {
                    const rowDate = new Date(rowDateStr);
                    if (!isNaN(rowDate.getTime())) {
                        rowDate.setHours(0, 0, 0, 0);

                        if (startDate) {
                            const sDate = new Date(startDate);
                            sDate.setHours(0, 0, 0, 0);
                            if (rowDate < sDate) matchesDate = false;
                        }
                        if (endDate) {
                            const eDate = new Date(endDate);
                            eDate.setHours(23, 59, 59, 999);
                            if (rowDate > eDate) matchesDate = false;
                        }
                    }
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
        setFilteredCards(filtered);
    };

    useEffect(() => {
        handleFilter();
    }, [statusFilter, search, lostCards, startDate, endDate]);

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

    const getStatusClass = (status) => {
        switch (status) {
            case 'Chờ xử lý':
                return 'status-pending';
            case 'Đang xử lý':
                return 'status-processing';
            case 'Đã xong':
            case 'Đã tìm lại':
                return 'status-recovered';
            case 'Đã hủy thẻ':
                return 'status-cancelled';
            default:
                return '';
        }
    };

    // Thống kê số liệu
    const totalLost = lostCards.length;
    const pendingCount = lostCards.filter(c => c.status === 'Chờ xử lý').length;
    const processingCount = lostCards.filter(c => c.status === 'Đang xử lý').length;
    const resolvedCount = lostCards.filter(c => c.status === 'Đã xong' || c.status === 'Đã tìm lại' || c.status === 'Đã xử lý').length;

    return (
        <div className="lost-card-log-wrapper">
            {/* Stats Cards */}
            <div className="lost-kpi-container">
                <div className="lost-kpi-grid">
                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-gray">
                                <span className="material-symbols-outlined">badge</span>
                            </div>
                            <span className="lost-kpi-title">Tổng thẻ báo mất</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value">{totalLost}</div>
                            <div className="lost-kpi-footer txt-gray">Hệ thống tổng hợp</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-red">
                                <span className="material-symbols-outlined">assignment_late</span>
                            </div>
                            <span className="lost-kpi-title">Đang chờ xử lý</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-red">{pendingCount}</div>
                            <div className="lost-kpi-footer txt-orange">Chờ tiếp nhận</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-blue">
                                <span className="material-symbols-outlined">sync</span>
                            </div>
                            <span className="lost-kpi-title">Đang xử lý</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-blue">{processingCount}</div>
                            <div className="lost-kpi-footer txt-blue">Đối chiếu hình ảnh</div>
                        </div>
                    </div>

                    <div className="lost-kpi-card">
                        <div className="lost-kpi-header">
                            <div className="lost-kpi-icon-box icon-green">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <span className="lost-kpi-title">Đã xong</span>
                        </div>
                        <div className="lost-kpi-body">
                            <div className="lost-kpi-value val-green">{resolvedCount}</div>
                            <div className="lost-kpi-footer txt-green">Giải quyết xong</div>
                        </div>
                    </div>
                </div>

                <div className="lost-dist-card">
                    <div className="lost-dist-title">
                        <span className="material-symbols-outlined">monitoring</span>
                        Tỷ lệ phân phối xử lý
                    </div>
                    <hr className="lost-dist-divider" />

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Mốc tổng thẻ</span>
                            <span><span className="lost-dist-val">{totalLost}</span> <span className="lost-dist-pct">(100%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-dark" style={{ width: '100%' }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Chờ xử lý</span>
                            <span><span className="lost-dist-val">{pendingCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((pendingCount / totalLost) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-gray" style={{ width: `${totalLost > 0 ? (pendingCount / totalLost) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đang xử lý</span>
                            <span><span className="lost-dist-val">{processingCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((processingCount / totalLost) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-blue" style={{ width: `${totalLost > 0 ? (processingCount / totalLost) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="lost-dist-item">
                        <div className="lost-dist-label-row">
                            <span>Đã xong</span>
                            <span><span className="lost-dist-val">{resolvedCount}</span> <span className="lost-dist-pct">({totalLost > 0 ? Math.round((resolvedCount / totalLost) * 100) : 0}%)</span></span>
                        </div>
                        <div className="lost-dist-track">
                            <div className="lost-dist-fill bg-green" style={{ width: `${totalLost > 0 ? (resolvedCount / totalLost) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="lost-filter-card">
                <div className="filter-block">
                    <label className="filter-label">Tìm kiếm nâng cao</label>
                    <div className="filter-input-wrapper">
                        <span className="material-symbols-outlined icon-left">search</span>
                        <input
                            type="text"
                            className="filter-input has-icon-left"
                            placeholder="Nhập mã báo mất, mã thẻ, biển số, chủ xe..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">Trạng thái xử lý</label>
                    <div className="filter-input-wrapper">
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả">Tất cả trạng thái</option>
                            <option value="Chờ xử lý">Chờ xử lý</option>
                            <option value="Đang xử lý">Đang xử lý</option>
                            <option value="Đã xong">Đã xong</option>
                        </select>
                        <span className="material-symbols-outlined icon-right">expand_more</span>
                    </div>
                </div>

                <div className="filter-block">
                    <label className="filter-label">Khoảng ngày báo mất</label>
                    <div className="filter-input-wrapper">
                        <div className="filter-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', color: '#334155', fontFamily: 'inherit', fontSize: '13px', width: '45%' }}
                            />
                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>đến</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', color: '#334155', fontFamily: 'inherit', fontSize: '13px', width: '45%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

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
                                                <td>{row.handler_name || '---'}</td>
                                                <td>
                                                    <button type="button" className="lost-action-btn" onClick={() => setEditingCard(row)}>
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
                                    Tạo báo mất
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {editingCard && (
                <div className="lost-modal-overlay">
                    <div className="lost-modal">
                        <div className="lost-modal-header">
                            <h2>Chỉnh sửa báo mất</h2>
                        </div>

                        <div className="lost-modal-body">
                            <div className="lost-form-group">
                                <label>Mã thẻ</label>
                                <input
                                    type="text"
                                    value={editingCard.card_code || editingCard.cardNo || ''}
                                    onChange={(e) => setEditingCard({ ...editingCard, card_code: e.target.value })}
                                />
                            </div>

                            <div className="lost-form-group">
                                <label>Biển số xe</label>
                                <input
                                    type="text"
                                    value={editingCard.plate_number || editingCard.plate || ''}
                                    onChange={(e) => setEditingCard({ ...editingCard, plate_number: e.target.value })}
                                />
                            </div>

                            <div className="lost-form-group">
                                <label>Loại thẻ</label>
                                <select
                                    value={editingCard.card_type || 'Thẻ lượt'}
                                    onChange={(e) => setEditingCard({ ...editingCard, card_type: e.target.value })}
                                >
                                    <option value="Thẻ tháng">Thẻ tháng</option>
                                    <option value="Thẻ lượt">Thẻ lượt</option>
                                    <option value="Thẻ vãng lai">Thẻ vãng lai</option>
                                </select>
                            </div>

                            <div className="lost-form-group">
                                <label>Trạng thái</label>
                                <select
                                    value={editingCard.status || 'Chờ xử lý'}
                                    onChange={(e) => setEditingCard({ ...editingCard, status: e.target.value })}
                                >
                                    <option value="Chờ xử lý">Chờ xử lý</option>
                                    <option value="Đang xử lý">Đang xử lý</option>
                                    <option value="Đã xong">Đã xong</option>
                                </select>
                            </div>

                            <div className="lost-form-group">
                                <label>Người xử lý</label>
                                <input
                                    type="text"
                                    value={editingCard.handler_name || ''}
                                    onChange={(e) => setEditingCard({ ...editingCard, handler_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="lost-modal-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setEditingCard(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn-save"
                                onClick={handleUpdateLostCard}
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="lost-modal-overlay">
                    <div className="lost-modal">
                        <div className="lost-modal-header">
                            <h2>Tạo báo mất mới</h2>
                        </div>
                        <div className="lost-modal-body">
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
                        </div>

                        <div className="lost-modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Hủy</button>
                            <button type="button" className="btn-save" onClick={handleCreateLostCard}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}