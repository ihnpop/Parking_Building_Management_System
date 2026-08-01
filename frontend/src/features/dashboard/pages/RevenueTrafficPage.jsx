// Import hook useState từ React để quản lý UI state
import { useState } from 'react';
// Import CSS tùy chỉnh giao diện trang báo cáo doanh thu & lưu lượng
import "./RevenueTrafficPage.css";

// ─── Dữ Liệu Mẫu (Mock Data) Cho Biểu Đồ Thanh Doanh Thu & Lưu Lượng ───
const barChartData = [
    { label: '00-04', revenue: 20, traffic: 15 },
    { label: '04-08', revenue: 35, traffic: 45 },
    { label: '08-12', revenue: 85, traffic: 95 },
    { label: '12-16', revenue: 75, traffic: 80 },
    { label: '16-20', revenue: 90, traffic: 100 },
    { label: '20-23', revenue: 40, traffic: 50 },
];

// ─── Dữ Liệu Mẫu (Mock Data) Danh Sách Giao Dịch Gần Nhất ───────────
const transactions = [
    {
        id: '#KP-88219',
        plate: '51A-992.41',
        type: 'Ô tô 4 chỗ',
        timeIn: '08:15',
        timeOut: '10:45',
        duration: '2h 30m',
        amount: '65.000đ',
        status: 'Đã thanh toán',
    },
    {
        id: '#KP-88220',
        plate: '59C-112.56',
        type: 'Ô tô 7 chỗ',
        timeIn: '09:30',
        timeOut: '11:20',
        duration: '1h 50m',
        amount: '45.000đ',
        status: 'Đã thanh toán',
    },
    {
        id: '#KP-88221',
        plate: '29A-456.88',
        type: 'Xe bán tải',
        timeIn: '10:05',
        timeOut: '14:15',
        duration: '4h 10m',
        amount: '120.000đ',
        status: 'Đã thanh toán',
    },
    {
        id: '#KP-88222',
        plate: '60B-772.33',
        type: 'Xe máy',
        timeIn: '07:00',
        timeOut: '18:30',
        duration: '11h 30m',
        amount: '15.000đ',
        status: 'Đã thanh toán',
    },
];

// ─── Component Chính Trang Báo Cáo Doanh Thu & Lưu Lượng ───────────────
export default function RevenueTrafficPage() {
    // State chọn khoảng thời gian xem báo cáo ('Hôm nay', 'Tuần này', 'Tháng này')
    const [selectedPeriod, setSelectedPeriod] = useState('Hôm nay');
    // State chọn lọc loại phương tiện xe ('Tất cả phương tiện', 'Ô tô 4 chỗ', ...)
    const [selectedVehicleType, setSelectedVehicleType] = useState('Tất cả phương tiện');
    // State lưu dòng giao dịch đang được nhấp chọn trong bảng
    const [selectedRow, setSelectedRow] = useState(null);
    // State kiểm soát hiệu ứng loading mờ nhẹ khi bấm nút Lọc dữ liệu
    const [isFiltering, setIsFiltering] = useState(false);

    // Hàm giả lập xử lý sự kiện bấm nút Lọc dữ liệu
    const handleFilter = () => {
        setIsFiltering(true);
        setTimeout(() => setIsFiltering(false), 800); // Tắt hiệu ứng sau 800ms
    };

    return (
        <section className="stats-dashboard-page" style={{ width: '100%' }}>
            {/* Khung chứa các phần tử giao diện báo cáo */}
            <div className={`stats-container ${isFiltering ? 'rtp-content--fading' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Khối Thẻ Bộ Lọc Thời Gian & Phương Tiện */}
                <div className="filter-card">
                    {/* Lọc theo khoảng thời gian */}
                    <div className="filter-group">
                        <label className="filter-label">Khoảng thời gian</label>
                        <div className="select-input-wrapper">
                            <span className="material-symbols-outlined select-calendar-icon">calendar_today</span>
                            <select
                                className="filter-select"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                <option>Hôm nay</option>
                                <option>Tuần này</option>
                                <option>Tháng này</option>
                            </select>
                        </div>
                    </div>

                    {/* Lọc theo loại phương tiện */}
                    <div className="filter-group">
                        <label className="filter-label">Loại xe</label>
                        <div className="select-input-wrapper">
                            <span className="material-symbols-outlined select-calendar-icon">directions_car</span>
                            <select
                                className="filter-select"
                                value={selectedVehicleType}
                                onChange={(e) => setSelectedVehicleType(e.target.value)}
                            >
                                <option>Tất cả phương tiện</option>
                                <option>Ô tô 4 chỗ</option>
                                <option>Ô tô 7 chỗ</option>
                                <option>Xe máy</option>
                                <option>Xe bán tải</option>
                            </select>
                        </div>
                    </div>

                    {/* Nút hành động Lọc dữ liệu */}
                    <button
                        className={`filter-btn ${isFiltering ? 'rtp-filter-btn--loading' : ''}`}
                        onClick={handleFilter}
                        disabled={isFiltering}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span className={`material-symbols-outlined ${isFiltering ? 'rtp-spin' : ''}`}>
                            {isFiltering ? 'refresh' : 'filter_list'}
                        </span>
                        {isFiltering ? 'Đang tải...' : 'Lọc dữ liệu'}
                    </button>
                </div>

                {/* 2. Lưới 2 Card Thống Kê Tổng Quan (Xe 4 Bánh & Xe 2 Bánh) */}
                <div className="stats-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Card Thống kê Xe 4 bánh */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">XE 4 BÁNH</p>
                                <h2 className="stat-card-value">92.150.000đ</h2>
                            </div>
                            <div className="stat-card-icon-wrapper wallet-bg">
                                <span className="material-symbols-outlined text-orange">directions_car</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className="trend-tag trend-up">▲ +9%</span>
                            <span className="trend-lbl">vs tháng trước</span>
                            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#0f172a' }}>2,510</strong> lượt xe
                            </span>
                        </div>
                    </div>

                    {/* Card Thống kê Xe 2 bánh */}
                    <div className="stat-overview-card">
                        <div className="stat-card-main">
                            <div>
                                <p className="stat-card-title">XE 2 BÁNH</p>
                                <h2 className="stat-card-value">15.800.000đ</h2>
                            </div>
                            <div className="stat-card-icon-wrapper login-bg">
                                <span className="material-symbols-outlined text-blue">moped</span>
                            </div>
                        </div>
                        <div className="stat-card-footer">
                            <span className="trend-tag trend-down">▼ -2%</span>
                            <span className="trend-lbl">vs tháng trước</span>
                            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>
                                <strong style={{ color: '#0f172a' }}>3,420</strong> lượt xe
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Panel Biểu Đồ Cột Doanh Thu & Lưu Lượng Phân Theo Giờ */}
                <div className="chart-panel-card">
                    <div className="chart-panel-header">
                        <div>
                            <h3>Biểu đồ Doanh thu &amp; Lưu lượng</h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>Phân tích mật độ và nguồn thu theo thời gian thực</p>
                        </div>
                    </div>

                    {/* Vùng dựng biểu đồ cột bằng HTML/CSS */}
                    <div className="rtp-chart-area">
                        {/* Trục tung Y-Axis */}
                        <div className="rtp-chart-yaxis">
                            <span>100M</span>
                            <span>75M</span>
                            <span>50M</span>
                            <span>25M</span>
                            <span>0</span>
                        </div>

                        {/* Các cột biểu đồ ghép cặp (Doanh thu + Lưu lượng) */}
                        <div className="rtp-chart-bars">
                            {barChartData.map((d) => (
                                <div key={d.label} className="rtp-bar-group">
                                    <div className="rtp-bar-pair">
                                        {/* Thanh Doanh thu (Màu cam) */}
                                        <div
                                            className="rtp-bar rtp-bar--revenue"
                                            style={{ height: `${d.revenue}%` }}
                                            title={`Doanh thu: ${d.revenue}%`}
                                        />
                                        {/* Thanh Lưu lượng xe (Màu xám) */}
                                        <div
                                            className="rtp-bar rtp-bar--traffic"
                                            style={{ height: `${d.traffic}%` }}
                                            title={`Lưu lượng: ${d.traffic}%`}
                                        />
                                    </div>
                                    <span className="rtp-bar-label">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ghi chú Legend màu sắc biểu đồ */}
                    <div className="chart-legend-box" style={{ borderTop: 'none', marginTop: '16px', paddingTop: 0 }}>
                        <div className="legend-item">
                            <span className="legend-dot orange-dot"></span>
                            <span>Doanh thu (Revenue)</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ backgroundColor: '#e2e2e5' }}></span>
                            <span>Lưu lượng (Traffic)</span>
                        </div>
                    </div>
                </div>

                {/* 4. Panel Bảng Danh Sách Các Giao Dịch Gần Nhất */}
                <div className="table-panel-card">
                    <div className="table-panel-header">
                        <h3>Giao dịch gần nhất</h3>
                    </div>

                    <div className="stats-table-wrapper">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Mã GD</th>
                                    <th>Biển số</th>
                                    <th>Loại xe</th>
                                    <th>Vào / Ra</th>
                                    <th>Thời lượng</th>
                                    <th>Số tiền</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className={selectedRow === txn.id ? 'rtp-row--selected' : ''}
                                        onClick={() => setSelectedRow(selectedRow === txn.id ? null : txn.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="txn-id-col" style={{ fontFamily: 'monospace' }}>{txn.id}</td>
                                        <td className="font-semibold" style={{ fontWeight: 700 }}>{txn.plate}</td>
                                        <td>
                                            <span className="rtp-type-badge">{txn.type}</span>
                                        </td>
                                        <td>{txn.timeIn} → {txn.timeOut}</td>
                                        <td>{txn.duration}</td>
                                        <td className="font-semibold" style={{ fontWeight: 700 }}>{txn.amount}</td>
                                        <td>
                                            <span className="status-tag success">{txn.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Chân trang thông tin phân trang */}
                    <div className="table-panel-footer" style={{ padding: '16px 24px', backgroundColor: '#fafbfb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Hiển thị 1 - 4 của 1,240 giao dịch</span>
                        <div className="rtp-pagination" style={{ display: 'flex', gap: '8px' }}>
                            <button className="rtp-page-btn" aria-label="Trang trước">
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button className="rtp-page-btn" aria-label="Trang sau">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}