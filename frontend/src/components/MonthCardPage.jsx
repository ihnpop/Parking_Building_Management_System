import { useNavigate } from 'react-router-dom'

/**
 * MonthCardPage displays monthly card management interface.
 * Features stats, search, filters, and a detailed data table.
 */

const statCards = [
    { label: 'Tổng số vé', value: '1,248', icon: 'card_membership', change: '+12%', changeType: 'positive' },
    { label: 'Đang hoạt động', value: '1,061', icon: 'check_circle', change: '85%', changeType: 'positive' },
    { label: 'Sắp hết hạn', value: '142', icon: 'warning', change: '+2%', changeType: 'negative' },
    { label: 'Đã hết hạn', value: '45', icon: 'schedule', change: '3.6%', changeType: 'neutral' },
]

const tableData = [
    { id: '01', cardNo: 'T-982341', plate: '30A-123.45', customer: 'Nguyễn Anh Tuấn', type: 'Ô tô 4 chỗ', startDate: '01/10/2023', endDate: '01/10/2024', status: 'Hoạt động' },
    { id: '02', cardNo: 'T-982342', plate: '29K-567.89', customer: 'Trần Thị Mai', type: 'Xe máy', startDate: '15/05/2023', endDate: '15/05/2024', status: 'Sắp hết hạn' },
    { id: '03', cardNo: 'T-982343', plate: '51G-001.23', customer: 'Lê Hoàng Nam', type: 'Ô tô 7 chỗ', startDate: '10/11/2022', endDate: '10/11/2023', status: 'Đã hết hạn' },
    { id: '04', cardNo: 'T-982344', plate: '30H-999.99', customer: 'Phạm Minh Đức', type: 'Ô tô 4 chỗ', startDate: '20/01/2024', endDate: '20/01/2025', status: 'Hoạt động' },
]

export default function MonthCardPage() {
    const navigate = useNavigate()

    return (
        <div className="month-card-page">
            <div className="month-header">
                <button type="button" className="month-back-button" onClick={() => navigate('/login/dashboard')}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Trở về Dashboard
                </button>

                <div className="month-title-section">
                    <h1>Quản lý Vé tháng</h1>
                </div>

                <div className="month-header-right">
                    <div className="month-user-badge">Admin</div>
                    <div className="month-actions">
                        <button type="button" className="month-btn month-btn-outline">
                            <span className="material-symbols-outlined">card_membership</span>
                            Đổi thẻ
                        </button>
                        <button type="button" className="month-btn month-btn-outline">
                            <span className="material-symbols-outlined">calendar_today</span>
                            Gia hạn
                        </button>
                        <button type="button" className="month-btn month-btn-primary">
                            <span className="material-symbols-outlined">add</span>
                            Thêm mới
                        </button>
                    </div>
                </div>
            </div>

            <div className="month-stats-grid">
                {statCards.map((stat) => (
                    <div key={stat.label} className="month-stat-card">
                        <div className="stat-icon">
                            <span className="material-symbols-outlined">{stat.icon}</span>
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <p className="stat-value">{stat.value}</p>
                        </div>
                        <div className={`stat-change ${stat.changeType}`}>
                            {stat.change}
                        </div>
                    </div>
                ))}
            </div>

            <div className="month-search-bar">
                <div className="search-input-wrapper">
                    <span className="material-symbols-outlined">search</span>
                    <input type="text" placeholder="Tìm theo biển số, tên chủ xe, số thẻ..." />
                </div>
                <button type="button" className="filter-btn">
                    <span className="material-symbols-outlined">tune</span>
                    Tất cả loại xe
                </button>
                <button type="button" className="filter-btn">
                    <span className="material-symbols-outlined">filter_list</span>
                    Tất cả trạng thái
                </button>
                <button type="button" className="sort-download-btn">
                    <span className="material-symbols-outlined">unfold_more</span>
                </button>
                <button type="button" className="sort-download-btn">
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            <div className="month-table-container">
                <table className="month-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>SỐ THẺ</th>
                            <th>BIỂN SỐ</th>
                            <th>TÊN KHÁCH HÀNG</th>
                            <th>LOẠI XE</th>
                            <th>NGÀY BẮT ĐẦU</th>
                            <th>NGÀY HẾT HẠN</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row) => (
                            <tr key={row.id}>
                                <td>{row.id}</td>
                                <td>{row.cardNo}</td>
                                <td>{row.plate}</td>
                                <td>{row.customer}</td>
                                <td>{row.type}</td>
                                <td>{row.startDate}</td>
                                <td>{row.endDate}</td>
                                <td>
                                    <span className={`status-badge ${row.status === 'Hoạt động' ? 'active' : row.status === 'Sắp hết hạn' ? 'expiring' : 'expired'}`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td>
                                    <button type="button" className="action-icon-btn">
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="month-pagination-footer">
                    <span className="pagination-info">Hiển thị 1 - 10 trên tổng số 1.248 bản ghi</span>
                    <div className="month-pagination">
                        <button type="button" className="page-btn">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button type="button" className="page-btn active">1</button>
                        <button type="button" className="page-btn">2</button>
                        <button type="button" className="page-btn">3</button>
                        <button type="button" className="page-btn">...</button>
                        <button type="button" className="page-btn">125</button>
                        <button type="button" className="page-btn">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
