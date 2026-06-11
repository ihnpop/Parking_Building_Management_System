import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCards } from '../../../service/cardApi';

/**
 * CardPage displays a centralized card management workspace.
 * Fetching data dynamically from Supabase via backend API.
 */

export default function CardPage() {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [typeFilter, setTypeFilter] = useState('Tất cả loại thẻ');
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

    const fetchCards = async () => {
        try {
            setLoading(true);
            const data = await getCards();
            setCards(data);
            setError(null);
        } catch (err) {
            console.error("Error loading cards:", err);
            setError("Không thể tải danh sách thẻ. Vui lòng thử lại sau!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCards();
    }, []);

    // Reset filters
    const handleResetFilters = () => {
        setTypeFilter('Tất cả loại thẻ');
        setStatusFilter('Tất cả trạng thái');
    };

    // Filter logic
    const filteredCards = cards.filter(card => {
        const matchesType = typeFilter === 'Tất cả loại thẻ' || card.type === typeFilter;
        const matchesStatus = statusFilter === 'Tất cả trạng thái' || card.status === statusFilter;
        return matchesType && matchesStatus;
    });

    // Stats
    const totalCards = cards.length;
    const activeCards = cards.filter(c => c.status === 'Hoạt động').length;
    const lockedCards = cards.filter(c => c.status === 'Đã khóa').length;

    const summaryItems = [
        { label: 'TỔNG SỐ THẺ', value: totalCards, note: 'Tất cả các thẻ đang quản lý' },
        { label: 'ĐANG HOẠT ĐỘNG', value: activeCards, note: 'Thẻ hiện đang sử dụng được' },
        { label: 'ĐÃ KHÓA', value: lockedCards, note: 'Thẻ bị chặn hoặc vô hiệu' },
    ];

    return (
        <main className="card-page">
            {/* Header chuẩn giống hình ảnh */}
            <header className="stats-top-bar">
                <div className="top-bar-left">
                    <button type="button" className="cardpage-back-button" onClick={() => navigate('/login/dashboard')}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        Trở về Dashboard
                    </button>
                </div>

                <h1 className="stats-page-title">Quản lý Thẻ</h1>

                <div className="top-bar-right">
                    <button type="button" className="header-action-btn" onClick={fetchCards}>
                        <span className="material-symbols-outlined">refresh</span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="bell-badge-dot"></span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">help</span>
                    </button>
                    <button type="button" className="header-action-btn">
                        <span className="material-symbols-outlined">settings</span>
                    </button>

                    <div className="header-user-profile">
                        <div className="profile-info-text">
                            <span className="profile-user-name">Admin User</span>
                            <span className="profile-user-role">SUPER ADMINISTRATOR</span>
                        </div>
                        <div className="profile-avatar-circle">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                    </div>
                </div>
            </header>

            <section className="cardpage-summary-grid">
                {summaryItems.map((item) => (
                    <article key={item.label} className="cardpage-summary-card">
                        <p className="summary-label">{item.label}</p>
                        <p className="summary-value">{loading ? '...' : item.value}</p>
                        <p className="summary-note">{item.note}</p>
                    </article>
                ))}
            </section>

            <section className="cardpage-toolbar">
                <div className="cardpage-filters">
                    <div className="cardpage-filter-group">
                        <label>Loại thẻ</label>
                        <select
                            className="cardpage-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="Tất cả loại thẻ">Tất cả loại thẻ</option>
                            <option value="Thẻ tháng">Thẻ tháng</option>
                            <option value="Thẻ lượt">Thẻ lượt</option>
                        </select>
                    </div>

                    <div className="cardpage-filter-group">
                        <label>Trạng thái</label>
                        <select
                            className="cardpage-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Đã khóa">Đã khóa</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        className="cardpage-button secondary"
                        onClick={handleResetFilters}
                    >
                        Làm mới bộ lọc
                    </button>
                </div>

                <div className="cardpage-actions">
                    <button type="button" className="cardpage-button outline" onClick={fetchCards}>
                        Tải lại dữ liệu
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

                {error && (
                    <div style={{ color: '#ff4d4d', padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        Đang tải danh sách thẻ...
                    </div>
                ) : (
                    <>
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
                                {filteredCards.length > 0 ? (
                                    filteredCards.map((row) => (
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            Không tìm thấy thẻ phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="cardpage-table-footer">
                            <span>Hiển thị {filteredCards.length} trong {totalCards}</span>
                            <div className="cardpage-pagination">
                                <button type="button" className="pagination-button" disabled>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button type="button" className="pagination-button active">1</button>
                                <button type="button" className="pagination-button" disabled>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </main>
    )
}