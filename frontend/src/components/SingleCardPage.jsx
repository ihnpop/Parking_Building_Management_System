import { useNavigate } from 'react-router-dom'

/**
 * SingleCardPage displays pricing tiers and fee structure.
 */

const pricingCards = [
    {
        title: 'Xe Máy',
        subtitle: 'Vé lượt ngày',
        icon: 'two_wheeler',
        prices: [
            { label: 'Vé lượt ngày', price: '5.000đ' },
            { label: 'Vé lượt đêm', price: '10.000đ' },
            { label: 'Cả ngày đêm', price: '15.000đ' },
        ],
    },
    {
        title: 'Ô tô (4 - 7 chỗ)',
        subtitle: '2 giờ đầu',
        icon: 'directions_car',
        prices: [
            { label: '2 giờ đầu', price: '30.000đ' },
            { label: 'Giờ tiếp theo', price: '+10.000đ' },
            { label: 'Cả ngày đêm', price: '120.000đ' },
        ],
    },
]

const surchargeTable = [
    {
        name: 'Phụ thu bổ sung lẻ / lẻ',
        condition: 'Tiền thêm tùy tính',
        note: '-20% giá gốc',
        status: 'Loại giá gốc',
    },
    {
        name: 'Quá giờ quá 2h (24h)',
        condition: 'Xe máy & ô tô',
        note: 'Tính theo lượt mới',
        status: 'Cập nhật',
    },
    {
        name: 'Hết thẻ / hết thằng thẻ',
        condition: 'Tất cả phương tiện',
        note: '50.000đ / thẻ',
        status: 'Cập nhật',
    },
]
//gbfgbngndbbs
const historyLogs = [
    {
        id: 1,
        title: 'Cập nhật giá vé 4 Ô tô (4-7 chỗ)',
        description: 'Thay đổi giá từ theo Diem 5.0 thể hiện. Thay lịch 18:00 - 18:00 Admin_01',
        date: '16/05/2023 09:45',
    },
    {
        id: 2,
        title: 'Miễn hoạt Phí thứ II Quốc thoại',
        description: 'Áp dụng gộp này 2024 chiêu độ 15.09. Thay lịch 5h 4m',
        date: '05/09/2023 02:00',
    },
]

export default function SingleCardPage() {
    const navigate = useNavigate()

    return (
        <div className="single-card-page">
            <div className="single-header">
                <button type="button" className="single-back-btn" onClick={() => navigate('/login/dashboard')}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Trở về Dashboard
                </button>
                <h1 className="single-page-title">Bảng Giá Vé Lượt</h1>
                <button type="button" className="single-edit-btn">
                    <span className="material-symbols-outlined">edit</span>
                    Lập vé mới
                </button>
            </div>

            <div className="single-current-rate">
                <div className="rate-info">
                    <div className="rate-icon">
                        <span className="material-symbols-outlined">schedule</span>
                    </div>
                    <div className="rate-text">
                        <p className="rate-label">Chu kỳ 24 Giờ</p>
                        <div className="rate-times">
                            <span className="time-slot">06:00 - 18:00</span>
                            <span className="time-separator">-</span>
                            <span className="time-slot">18:00 - 06:00</span>
                        </div>
                    </div>
                </div>
                <button type="button" className="single-edit-link">
                    <span>Chỉnh giá</span>
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            <div className="single-pricing-grid">
                {pricingCards.map((card) => (
                    <div key={card.title} className="single-pricing-card">
                        <div className="card-header">
                            <div className="card-icon">
                                <span className="material-symbols-outlined">{card.icon}</span>
                            </div>
                            <div className="card-title-block">
                                <h3>{card.title}</h3>
                                <p>{card.subtitle}</p>
                            </div>
                        </div>
                        <div className="card-prices">
                            {card.prices.map((price) => (
                                <div key={price.label} className="price-row">
                                    <span className="price-label">{price.label}</span>
                                    <span className="price-value">{price.price}</span>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="card-edit-btn">Cập nhật giá</button>
                    </div>
                ))}
            </div>

            <div className="single-surcharge-section">
                <div className="section-header">
                    <h2>Phụ thu & Điều khoản bổ sung</h2>
                </div>
                <table className="single-surcharge-table">
                    <thead>
                        <tr>
                            <th>ĐIỀU KHOẢN</th>
                            <th>ĐIỀU KIỆN GIAO</th>
                            <th>GHI CHÚ</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {surchargeTable.map((row, idx) => (
                            <tr key={idx}>
                                <td>
                                    <div className="table-item-icon">
                                        <span className="material-symbols-outlined">info</span>
                                    </div>
                                    {row.name}
                                </td>
                                <td>{row.condition}</td>
                                <td>{row.note}</td>
                                <td>
                                    <span className="status-badge">{row.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="single-history-section">
                <div className="section-header-with-link">
                    <h2>Lịch sử điều chỉnh giá hay</h2>
                    <a href="#" className="view-all-link">Xem tất cả lịch sử</a>
                </div>
                <div className="history-list">
                    {historyLogs.map((log) => (
                        <div key={log.id} className="history-item">
                            <div className="history-icon">
                                <span className="material-symbols-outlined">event_note</span>
                            </div>
                            <div className="history-content">
                                <h4>{log.title}</h4>
                                <p>{log.description}</p>
                            </div>
                            <span className="history-date">{log.date}</span>
                        </div>
                    ))}
                </div>
            </div>

            <footer className="single-footer">
                <p>© 2024 Parking Management System. All rights reserved</p>
            </footer>
        </div>
    )
}
