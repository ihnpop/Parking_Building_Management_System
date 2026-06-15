import { useState, useEffect } from 'react';
import { getMonthCards } from '../../../service/cardApi';

export default function MonthCardPage() {
    const [monthCards, setMonthCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Search (Giữ nguyên logic xử lý gốc)
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

    // Filter Logic dựa trên dữ liệu từ API Supabase của bạn
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

        const matchesStatus = statusFilter === 'Tất cả trạng thái' || row.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
    });

    // Tính toán số liệu thống kê nhanh (Stats)
    const total = monthCards.length;
    const active = monthCards.filter(c => c.status === 'Hoạt động').length;
    const expiring = monthCards.filter(c => c.status === 'Sắp hết hạn').length;
    const expired = monthCards.filter(c => c.status === 'Đã hết hạn').length;

    const statCards = [
        { label: 'Tổng số vé', value: total, icon: 'card_membership' },
        { label: 'Đang hoạt động', value: active, icon: 'check_circle' },
        { label: 'Sắp hết hạn', value: expiring, icon: 'warning' },
        { label: 'Đã hết hạn', value: expired, icon: 'schedule' },
    ];

    return (
        <div className="month-card-page" style={{ width: '100%' }}>

            {/* Thanh công cụ gồm đúng 3 nút thao tác căn sát về bên phải */}
            <div className="month-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                <button
                    type="button"
                    className="month-btn month-btn-outline"
                    onClick={fetchMonthCards}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                    Làm mới
                </button>
                <button
                    type="button"
                    className="month-btn month-btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
                    Gia hạn
                </button>
                <button
                    type="button"
                    className="month-btn month-btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#e65c00', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                    Thêm mới
                </button>
            </div>

            {/* Khối Thống kê số liệu dạng Grid */}
            <div className="month-stats-grid" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                {statCards.map((stat) => (
                    <div key={stat.label} className="month-stat-card" style={{ flex: 1, padding: '15px', border: '1px solid #eee', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fff' }}>
                        <span className="material-symbols-outlined" style={{ color: '#e65c00' }}>{stat.icon}</span>
                        <div>
                            <p className="stat-label" style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>{stat.label}</p>
                            <p className="stat-value" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>{loading ? '...' : stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Thanh tìm kiếm và bộ lọc dữ liệu nhanh */}
            <div className="month-search-bar" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 12px', flex: 1, background: '#fff' }}>
                    <span className="material-symbols-outlined" style={{ color: '#888', marginRight: '5px' }}>search</span>
                    <input
                        type="text"
                        placeholder="Tìm theo biển số, tên chủ xe, số thẻ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%' }}
                    />
                </div>

                <select value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}>
                    <option value="Tất cả loại xe">Tất cả loại xe</option>
                    <option value="Xe máy">Xe máy</option>
                    <option value="Ô tô">Ô tô</option>
                </select>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}>
                    <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Sắp hết hạn">Sắp hết hạn</option>
                    <option value="Đã hết hạn">Đã hết hạn</option>
                </select>

                <button type="button" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => { setSearch(''); setVehicleTypeFilter('Tất cả loại xe'); setStatusFilter('Tất cả trạng thái'); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
                </button>
            </div>

            {/* Khối hiển thị bảng dữ liệu */}
            <div className="month-table-container" style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', background: '#fff' }}>
                {error && <div style={{ color: '#ff4d4d', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                {loading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>Đang tải danh sách vé tháng...</div>
                ) : (
                    <>
                        <table className="month-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>STT</th>
                                    <th style={{ padding: '12px' }}>SỐ THẺ</th>
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
                                            <td style={{ padding: '12px' }}>{row.cardNo}</td>
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
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                            Không tìm thấy vé tháng phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}