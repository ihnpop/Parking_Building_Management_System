import { useNavigate } from 'react-router-dom'

/**
 * CardPage displays a centralized card management workspace.
 * Designed as a static React UI page with summary cards, filters, actions, and a table.
 */

const summaryItems = [
    { label: 'TỔNG SỐ THẺ', value: '1,240', note: 'Tất cả các thẻ đang quản lý' },
    { label: 'ĐANG HOẠT ĐỘNG', value: '1,204', note: 'Thẻ hiện đang sử dụng được' },
    { label: 'ĐÃ KHÓA', value: '12', note: 'Thẻ bị chặn hoặc vô hiệu' },
]

const rowData = [
    { code: 'C-2024-001', type: 'Thẻ tháng', plate: '29A - 123.45', status: 'Hoạt động' },
    { code: 'C-2024-002', type: 'Thẻ lượt', plate: '30G - 888.88', status: 'Đã khóa' },
    { code: 'C-2024-003', type: 'Thẻ tháng', plate: '51F - 567.89', status: 'Hoạt động' },
]

export default function CardPage() {
    const navigate = useNavigate()

    return (
        <main className="card-page">
            <header className="cardpage-header">
                <div className="cardpage-header-left">
                    <button type="button" className="cardpage-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Trở về Dashboard
                    </button>

                    <div className="cardpage-page-title">
                        <p className="cardpage-page-label">Hệ thống</p>
                        <h1>Quản lý Thẻ</h1>
                    </div>
                </div>

                <div className="cardpage-user-badge">Admin</div>
            </header>

            <section className="cardpage-summary-grid">
                {summaryItems.map((item) => (
                    <article key={item.label} className="cardpage-summary-card">
                        <p className="summary-label">{item.label}</p>
                        <p className="summary-value">{item.value}</p>
                        <p className="summary-note">{item.note}</p>
                    </article>
                ))}
            </section>

            <section className="cardpage-toolbar">
                <div className="cardpage-filters">
                    <div className="cardpage-filter-group">
                        <label>Loại thẻ</label>
                        <select className="cardpage-select">
                            <option>Tất cả loại thẻ</option>
                            <option>Thẻ tháng</option>
                            <option>Thẻ lượt</option>
                        </select>
                    </div>

                    <div className="cardpage-filter-group">
                        <label>Trạng thái</label>
                        <select className="cardpage-select">
                            <option>Tất cả trạng thái</option>
                            <option>Hoạt động</option>
                            <option>Đã khóa</option>
                        </select>
                    </div>

                    <button type="button" className="cardpage-button secondary">
                        Làm mới bộ lọc
                    </button>
                </div>

                <div className="cardpage-actions">
                    <button type="button" className="cardpage-button outline">
                        Cập nhật loại thẻ
                    </button>
                    <button type="button" className="cardpage-button primary">
                        Đăng ký thẻ mới
                    </button>
                </div>
            </section>

            <section className="cardpage-table-card">
                <div className="cardpage-table-header">
                    <h2>Danh sách thẻ</h2>
                    <p>Quản lý thông tin thẻ, loại thẻ, trạng thái và hành động.</p>
                </div>

                <table className="cardpage-table">
                    <thead>
                        <tr>
                            <th>MÃ THẺ</th>
                            <th>LOẠI</th>
                            <th>BIỂN SỐ</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rowData.map((row) => (
                            <tr key={row.code}>
                                <td>{row.code}</td>
                                <td>{row.type}</td>
                                <td>{row.plate}</td>
                                <td>
                                    <span className={`cardpage-status ${row.status === 'Hoạt động' ? 'active' : 'locked'}`}>
                                        <span className="material-symbols-outlined">circle</span>
                                        {row.status}
                                    </span>
                                </td>
                                <td>
                                    <button type="button" className="cardpage-icon-button">
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="cardpage-table-footer">
                    <span>Hiển thị 3 trong 1,240</span>
                    <div className="cardpage-pagination">
                        <button type="button" className="pagination-button">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button type="button" className="pagination-button active">1</button>
                        <button type="button" className="pagination-button">2</button>
                        <button type="button" className="pagination-button">
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </section>
        </main>
    )
}
