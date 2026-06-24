// import { useState, useEffect, useMemo } from 'react';
// import { getMonthCards } from '../../../service/cardApi';
// import RenewCardDialog from '../components/RenewCardDialog';
// import EditMonthCardDialog from '../components/EditMonthCardDialog';

// const ITEMS_PER_PAGE = 8;

// export default function MonthCardPage() {
//     const [monthCards, setMonthCards] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [renewingCard, setRenewingCard] = useState(null);
//     const [editingCard, setEditingCard] = useState(null);

//     // Filters & Search
//     const [search, setSearch] = useState('');
//     const [vehicleTypeFilter, setVehicleTypeFilter] = useState('Tất cả loại xe');
//     const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

//     // Pagination
//     const [currentPage, setCurrentPage] = useState(1);

//     const fetchMonthCards = async () => {
//         try {
//             setLoading(true);
//             const data = await getMonthCards();
//             setMonthCards(data);
//             setError(null);
//         } catch (err) {
//             console.error("Error fetching monthly cards:", err);
//             setError("Không thể tải danh sách vé tháng. Vui lòng thử lại sau!");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchMonthCards();
//     }, []);

//     // Filter Logic
//     const filteredData = useMemo(() => {
//         return monthCards.filter((row) => {
//             const matchesSearch =
//                 (row.cardNo || '').toLowerCase().includes(search.toLowerCase()) ||
//                 (row.plate || '').toLowerCase().includes(search.toLowerCase()) ||
//                 (row.customer || '').toLowerCase().includes(search.toLowerCase());

//             const matchesType =
//                 vehicleTypeFilter === 'Tất cả loại xe' ||
//                 (row.type || '').toLowerCase().includes(vehicleTypeFilter.toLowerCase()) ||
//                 (vehicleTypeFilter === 'Ô tô' && (row.type || '').toLowerCase().includes('ô tô')) ||
//                 (vehicleTypeFilter === 'Xe máy' && (row.type || '').toLowerCase().includes('xe máy'));

//             const matchesStatus = statusFilter === 'Tất cả trạng thái' || row.status === statusFilter;

//             return matchesSearch && matchesType && matchesStatus;
//         });
//     }, [monthCards, search, vehicleTypeFilter, statusFilter]);

//     // Reset to page 1 when filters change
//     useEffect(() => {
//         setCurrentPage(1);
//     }, [search, vehicleTypeFilter, statusFilter]);

//     // Pagination logic
//     const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
//     const paginatedData = filteredData.slice(
//         (currentPage - 1) * ITEMS_PER_PAGE,
//         currentPage * ITEMS_PER_PAGE
//     );

//     const getPageNumbers = () => {
//         const pages = [];
//         if (totalPages <= 5) {
//             for (let i = 1; i <= totalPages; i++) pages.push(i);
//         } else {
//             pages.push(1);
//             if (currentPage > 3) pages.push('...');
//             const start = Math.max(2, currentPage - 1);
//             const end = Math.min(totalPages - 1, currentPage + 1);
//             for (let i = start; i <= end; i++) pages.push(i);
//             if (currentPage < totalPages - 2) pages.push('...');
//             pages.push(totalPages);
//         }
//         return pages;
//     };

//     // Stats
//     const total = monthCards.length;
//     const active = monthCards.filter(c => c.status === 'Hoạt động').length;
//     const expiring = monthCards.filter(c => c.status === 'Sắp hết hạn').length;
//     const expired = monthCards.filter(c => c.status === 'Đã hết hạn').length;

//     const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
//     const expiringPercent = total > 0 ? Math.round((expiring / total) * 100) : 0;
//     const expiredPercent = total > 0 ? Math.round((expired / total) * 100) : 0;

//     // SVG donut chart calculation
//     const circumference = 2 * Math.PI * 15.915;
//     const activeStroke = (activePercent / 100) * circumference;
//     const expiringStroke = (expiringPercent / 100) * circumference;
//     const expiredStroke = (expiredPercent / 100) * circumference;

//     const getStatusBadgeClass = (status) => {
//         switch (status) {
//             case 'Hoạt động': return 'mc-status-badge mc-status-active';
//             case 'Sắp hết hạn': return 'mc-status-badge mc-status-expiring';
//             case 'Đã hết hạn': return 'mc-status-badge mc-status-expired';
//             default: return 'mc-status-badge mc-status-active';
//         }
//     };

//     const handleReset = () => {
//         setSearch('');
//         setVehicleTypeFilter('Tất cả loại xe');
//         setStatusFilter('Tất cả trạng thái');
//     };

//     return (
//         <div className="mc-page">
//             {/* Stats Row */}
//             <div className="mc-stats-row">
//                 <div className="mc-stats-grid">
//                     {/* Tổng số vé */}
//                     <div className="mc-stat-card">
//                         <div className="mc-stat-icon mc-stat-icon-primary">
//                             <span className="material-symbols-outlined">confirmation_number</span>
//                         </div>
//                         <div>
//                             <p className="mc-stat-label">Tổng số vé</p>
//                             <p className="mc-stat-value">{loading ? '...' : total}</p>
//                         </div>
//                     </div>
//                     {/* Đang hoạt động */}
//                     <div className="mc-stat-card">
//                         <div className="mc-stat-icon mc-stat-icon-secondary">
//                             <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
//                         </div>
//                         <div>
//                             <p className="mc-stat-label">Đang hoạt động</p>
//                             <p className="mc-stat-value">{loading ? '...' : active}</p>
//                         </div>
//                     </div>
//                     {/* Sắp hết hạn */}
//                     <div className="mc-stat-card">
//                         <div className="mc-stat-icon mc-stat-icon-warning">
//                             <span className="material-symbols-outlined">warning</span>
//                         </div>
//                         <div>
//                             <p className="mc-stat-label">Sắp hết hạn</p>
//                             <p className="mc-stat-value">{loading ? '...' : expiring}</p>
//                         </div>
//                     </div>
//                     {/* Đã hết hạn */}
//                     <div className="mc-stat-card">
//                         <div className="mc-stat-icon mc-stat-icon-error">
//                             <span className="material-symbols-outlined">schedule</span>
//                         </div>
//                         <div>
//                             <p className="mc-stat-label">Hết hạn</p>
//                             <p className="mc-stat-value">{loading ? '...' : expired}</p>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Donut Chart */}
//                 <div className="mc-donut-card">
//                     <h3 className="mc-donut-title">TỶ LỆ TRẠNG THÁI THẺ</h3>
//                     <div className="mc-donut-wrapper">
//                         <svg className="mc-donut-svg" viewBox="0 0 36 36">
//                             <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e1e1ee" strokeWidth="3" />
//                             {/* Active */}
//                             <circle cx="18" cy="18" r="15.915" fill="transparent"
//                                 stroke="#006d38"
//                                 strokeWidth="3"
//                                 strokeDasharray={`${activeStroke} ${circumference - activeStroke}`}
//                                 strokeDashoffset="25"
//                             />
//                             {/* Expiring */}
//                             {expiringPercent > 0 && (
//                                 <circle cx="18" cy="18" r="15.915" fill="transparent"
//                                     stroke="#d0c715ff"
//                                     strokeWidth="3"
//                                     strokeDasharray={`${expiringStroke} ${circumference - expiringStroke}`}
//                                     strokeDashoffset={25 - activeStroke}
//                                 />
//                             )}
//                             {/* Expired */}
//                             {expiredPercent > 0 && (
//                                 <circle cx="18" cy="18" r="15.915" fill="transparent"
//                                     stroke="#ba1a1a"
//                                     strokeWidth="3"
//                                     strokeDasharray={`${expiredStroke} ${circumference - expiredStroke}`}
//                                     strokeDashoffset={25 - activeStroke - expiringStroke}
//                                 />
//                             )}
//                         </svg>
//                         <div className="mc-donut-center">
//                             <span className="mc-donut-percent">{loading ? '...' : `${activePercent}%`}</span>
//                             <span className="mc-donut-sub">Hoạt động</span>
//                         </div>
//                     </div>
//                     <div className="mc-donut-legend">
//                         <div className="mc-legend-item">
//                             <div className="mc-legend-dot mc-legend-active"></div>
//                             <span>Hoạt động</span>
//                         </div>
//                         <div className="mc-legend-item">
//                             <div className="mc-legend-dot mc-legend-expiring"></div>
//                             <span>Sắp hết hạn</span>
//                         </div>
//                         <div className="mc-legend-item">
//                             <div className="mc-legend-dot mc-legend-expired"></div>
//                             <span>Hết hạn</span>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Action Bar */}
//             <div className="mc-action-bar">
//                 <div className="mc-filters">
//                     <div className="mc-search-wrapper">
//                         <span className="material-symbols-outlined mc-search-icon">search</span>
//                         <input
//                             type="text"
//                             className="mc-search-input"
//                             placeholder="Tìm theo biển số, tên chủ xe, số thẻ..."
//                             value={search}
//                             onChange={(e) => setSearch(e.target.value)}
//                         />
//                     </div>
//                     <select
//                         className="mc-filter-select"
//                         value={vehicleTypeFilter}
//                         onChange={(e) => setVehicleTypeFilter(e.target.value)}
//                     >
//                         <option value="Tất cả loại xe">Tất cả loại xe</option>
//                         <option value="Xe máy">Xe máy</option>
//                         <option value="Ô tô">Ô tô</option>
//                     </select>
//                     <select
//                         className="mc-filter-select"
//                         value={statusFilter}
//                         onChange={(e) => setStatusFilter(e.target.value)}
//                     >
//                         <option value="Tất cả trạng thái">Tất cả trạng thái</option>
//                         <option value="Hoạt động">Hoạt động</option>
//                         <option value="Sắp hết hạn">Sắp hết hạn</option>
//                         <option value="Đã hết hạn">Đã hết hạn</option>
//                     </select>
//                 </div>
//                 <div className="mc-action-buttons">
//                     <button type="button" className="mc-btn mc-btn-outline" onClick={handleReset}>
//                         <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
//                         Làm mới
//                     </button>
//                     <button type="button" className="mc-btn mc-btn-outline" onClick={() => alert("Vui lòng chọn nút Gia hạn ở cột Thao tác của từng thẻ tháng trong danh sách bên dưới.")}>
//                         <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
//                         Gia hạn
//                     </button>
//                     <button type="button" className="mc-btn mc-btn-primary">
//                         <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
//                         Thêm mới
//                     </button>
//                 </div>
//             </div>

//             {/* Data Table */}
//             <div className="mc-table-card">
//                 {error && (
//                     <div className="mc-error-message">{error}</div>
//                 )}

//                 {loading ? (
//                     <div className="mc-loading-message">Đang tải danh sách vé tháng...</div>
//                 ) : (
//                     <>
//                         <div className="mc-table-scroll">
//                             <table className="mc-table">
//                                 <thead>
//                                     <tr>
//                                         <th>STT</th>
//                                         <th>Số thẻ</th>
//                                         <th>Biển số</th>
//                                         <th>Tên khách hàng</th>
//                                         <th>Loại xe</th>
//                                         <th>Ngày bắt đầu</th>
//                                         <th>Ngày hết hạn</th>
//                                         <th>Trạng thái</th>
//                                         <th className="mc-th-center">Thao tác</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {paginatedData.length > 0 ? (
//                                         paginatedData.map((row, index) => (
//                                             <tr key={row.id || index} className="mc-table-row">
//                                                 <td>{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</td>
//                                                 <td className="mc-td-bold">{row.cardNo}</td>
//                                                 <td>{row.plate || '---'}</td>
//                                                 <td>{row.customer || 'Khách vãng lai'}</td>
//                                                 <td>{row.type || 'Xe máy'}</td>
//                                                 <td>{row.startDate || 'Chưa có'}</td>
//                                                 <td>{row.endDate || 'Không giới hạn'}</td>
//                                                 <td>
//                                                     <span className={getStatusBadgeClass(row.status)}>
//                                                         {row.status}
//                                                     </span>
//                                                 </td>
//                                                 <td className="mc-td-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
//                                                     <button
//                                                         type="button"
//                                                         className="mc-edit-btn"
//                                                         style={{ background: 'none', border: 'none', cursor: 'pointer' }}
//                                                         title="Chỉnh sửa"
//                                                         onClick={() => setEditingCard(row)}
//                                                     >
//                                                         <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
//                                                     </button>
//                                                     <button
//                                                         type="button"
//                                                         className="mc-renew-btn"
//                                                         style={{ color: '#004bca', background: 'none', border: 'none', cursor: 'pointer' }}
//                                                         title="Gia hạn"
//                                                         onClick={() => setRenewingCard(row)}
//                                                         disabled={!row.registrationId || row.status === 'Đã khóa'}
//                                                     >
//                                                         <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
//                                                     </button>
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     ) : (
//                                         <tr>
//                                             <td colSpan="9" className="mc-empty-row">
//                                                 Không tìm thấy vé tháng phù hợp
//                                             </td>
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Pagination Footer */}
//                         <div className="mc-pagination-footer">
//                             <p className="mc-pagination-info">
//                                 Hiển thị {filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} của {filteredData.length} kết quả
//                             </p>
//                             <div className="mc-pagination-controls">
//                                 <button
//                                     className="mc-page-nav"
//                                     disabled={currentPage === 1}
//                                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
//                                 >
//                                     <span className="material-symbols-outlined">chevron_left</span>
//                                 </button>
//                                 {getPageNumbers().map((page, i) => (
//                                     page === '...' ? (
//                                         <span key={`dots-${i}`} className="mc-page-dots">...</span>
//                                     ) : (
//                                         <button
//                                             key={page}
//                                             className={`mc-page-btn ${currentPage === page ? 'mc-page-btn-active' : ''}`}
//                                             onClick={() => setCurrentPage(page)}
//                                         >
//                                             {page}
//                                         </button>
//                                     )
//                                 ))}
//                                 <button
//                                     className="mc-page-nav"
//                                     disabled={currentPage === totalPages || totalPages === 0}
//                                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
//                                 >
//                                     <span className="material-symbols-outlined">chevron_right</span>
//                                 </button>
//                             </div>
//                         </div>
//                     </>
//                 )}
//             </div>

//             <RenewCardDialog
//                 isOpen={!!renewingCard}
//                 onClose={() => setRenewingCard(null)}
//                 cardData={renewingCard}
//                 onSuccess={fetchMonthCards}
//             />
//             <EditMonthCardDialog
//                 isOpen={!!editingCard}
//                 onClose={() => setEditingCard(null)}
//                 cardData={editingCard}
//                 onSuccess={fetchMonthCards}
//             />
//         </div>
//     );
// }   


import { useState, useEffect, useMemo } from 'react';
import { getMonthCards } from '../../../service/cardApi';
import RenewCardDialog from '../components/RenewCardDialog';
import EditMonthCardDialog from '../components/EditMonthCardDialog';
import CreateMonthCardDialog from '../components/CreateMonthCardDialog'; // Bổ sung dialog luồng eKYC mới

const ITEMS_PER_PAGE = 8;

export default function MonthCardPage() {
    const [monthCards, setMonthCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [renewingCard, setRenewingCard] = useState(null);
    const [editingCard, setEditingCard] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false); // Trạng thái mở modal eKYC tổng

    // Filters & Search
    const [search, setSearch] = useState('');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState('Tất cả loại xe');
    const [statusFilter, setStatusFilter] = useState('Tất cả trạng thái');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

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
        document.title = "Quản lý vé tháng | Parking Building Management System";
        fetchMonthCards();
    }, []);

    // Filter Logic
    const filteredData = useMemo(() => {
        return monthCards.filter((row) => {
            const matchesSearch =
                (row.cardNo || '').toLowerCase().includes(search.toLowerCase()) ||
                (row.plate || '').toLowerCase().includes(search.toLowerCase()) ||
                (row.customer || '').toLowerCase().includes(search.toLowerCase());

            const matchesType =
                vehicleTypeFilter === 'Tất cả loại xe' ||
                (row.type || '').toLowerCase().includes(vehicleTypeFilter.toLowerCase()) ||
                (vehicleTypeFilter === 'Ô tô' && (row.type || '').toLowerCase().includes('ô tô')) ||
                (vehicleTypeFilter === 'Xe máy' && (row.type || '').toLowerCase().includes('xe máy'));

            const matchesStatus = statusFilter === 'Tất cả trạng thái' || row.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [monthCards, search, vehicleTypeFilter, statusFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, vehicleTypeFilter, statusFilter]);

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    // Stats
    const total = monthCards.length;
    const active = monthCards.filter(c => c.status === 'Hoạt động').length;
    const expiring = monthCards.filter(c => c.status === 'Sắp hết hạn').length;
    const expired = monthCards.filter(c => c.status === 'Đã hết hạn').length;

    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;
    const expiringPercent = total > 0 ? Math.round((expiring / total) * 100) : 0;
    const expiredPercent = total > 0 ? Math.round((expired / total) * 100) : 0;

    // SVG donut chart calculation
    const circumference = 2 * Math.PI * 15.915;
    const activeStroke = (activePercent / 100) * circumference;
    const expiringStroke = (expiringPercent / 100) * circumference;
    const expiredStroke = (expiredPercent / 100) * circumference;

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Hoạt động': return 'mc-status-badge mc-status-active';
            case 'Sắp hết hạn': return 'mc-status-badge mc-status-expiring';
            case 'Đã hết hạn': return 'mc-status-badge mc-status-expired';
            default: return 'mc-status-badge mc-status-active';
        }
    };

    const handleReset = () => {
        setSearch('');
        setVehicleTypeFilter('Tất cả loại xe');
        setStatusFilter('Tất cả trạng thái');
    };

    return (
        <div className="mc-page">
            {/* Stats Row */}
            <div className="mc-stats-row">
                <div className="mc-stats-grid">
                    {/* Tổng số vé */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-primary">
                            <span className="material-symbols-outlined">confirmation_number</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Tổng số vé</p>
                            <p className="mc-stat-value">{loading ? '...' : total}</p>
                        </div>
                    </div>
                    {/* Đang hoạt động */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-secondary">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Đang hoạt động</p>
                            <p className="mc-stat-value">{loading ? '...' : active}</p>
                        </div>
                    </div>
                    {/* Sắp hết hạn */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-warning">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Sắp hết hạn</p>
                            <p className="mc-stat-value">{loading ? '...' : expiring}</p>
                        </div>
                    </div>
                    {/* Đã hết hạn */}
                    <div className="mc-stat-card">
                        <div className="mc-stat-icon mc-stat-icon-error">
                            <span className="material-symbols-outlined">schedule</span>
                        </div>
                        <div>
                            <p className="mc-stat-label">Hết hạn</p>
                            <p className="mc-stat-value">{loading ? '...' : expired}</p>
                        </div>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="mc-donut-card">
                    <h3 className="mc-donut-title">TỶ LỆ TRẠNG THÁI THẺ</h3>
                    <div className="mc-donut-wrapper">
                        <svg className="mc-donut-svg" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e1e1ee" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.915" fill="transparent"
                                stroke="#006d38"
                                strokeWidth="3"
                                strokeDasharray={`${activeStroke} ${circumference - activeStroke}`}
                                strokeDashoffset="25"
                            />
                            {expiringPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#d0c715ff"
                                    strokeWidth="3"
                                    strokeDasharray={`${expiringStroke} ${circumference - expiringStroke}`}
                                    strokeDashoffset={25 - activeStroke}
                                />
                            )}
                            {expiredPercent > 0 && (
                                <circle cx="18" cy="18" r="15.915" fill="transparent"
                                    stroke="#ba1a1a"
                                    strokeWidth="3"
                                    strokeDasharray={`${expiredStroke} ${circumference - expiredStroke}`}
                                    strokeDashoffset={25 - activeStroke - expiringStroke}
                                />
                            )}
                        </svg>
                        <div className="mc-donut-center">
                            <span className="mc-donut-percent">{loading ? '...' : `${activePercent}%`}</span>
                            <span className="mc-donut-sub">Hoạt động</span>
                        </div>
                    </div>
                    <div className="mc-donut-legend">
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-active"></div>
                            <span>Hoạt động</span>
                        </div>
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-expiring"></div>
                            <span>Sắp hết hạn</span>
                        </div>
                        <div className="mc-legend-item">
                            <div className="mc-legend-dot mc-legend-expired"></div>
                            <span>Hết hạn</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mc-action-bar">
                <div className="mc-filters">
                    <div className="mc-search-wrapper">
                        <span className="material-symbols-outlined mc-search-icon">search</span>
                        <input
                            type="text"
                            className="mc-search-input"
                            placeholder="Tìm theo biển số, tên chủ xe, số thẻ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="mc-filter-select"
                        value={vehicleTypeFilter}
                        onChange={(e) => setVehicleTypeFilter(e.target.value)}
                    >
                        <option value="Tất cả loại xe">Tất cả loại xe</option>
                        <option value="Xe máy">Xe máy</option>
                        <option value="Ô tô">Ô tô</option>
                    </select>
                    <select
                        className="mc-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Sắp hết hạn">Sắp hết hạn</option>
                        <option value="Đã hết hạn">Đã hết hạn</option>
                    </select>
                </div>
                <div className="mc-action-buttons">
                    <button type="button" className="mc-btn mc-btn-outline" onClick={handleReset}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                        Làm mới
                    </button>
                    <button type="button" className="mc-btn mc-btn-outline" onClick={() => alert("Vui lòng chọn nút Gia hạn ở cột Thao tác của từng thẻ tháng trong danh sách bên dưới.")}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
                        Gia hạn
                    </button>
                    {/* Cập nhật sự kiện click kích hoạt Luồng Tạo Mới kèm eKYC */}
                    <button type="button" className="mc-btn mc-btn-primary" onClick={() => setIsCreateOpen(true)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Thêm mới (eKYC)
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="mc-table-card">
                {error && <div className="mc-error-message">{error}</div>}

                {loading ? (
                    <div className="mc-loading-message">Đang tải danh sách vé tháng...</div>
                ) : (
                    <>
                        <div className="mc-table-scroll">
                            <table className="mc-table">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Số thẻ</th>
                                        <th>Biển số</th>
                                        <th>Tên khách hàng</th>
                                        <th>Loại xe</th>
                                        <th>Ngày bắt đầu</th>
                                        <th>Ngày hết hạn</th>
                                        <th>Trạng thái</th>
                                        <th className="mc-th-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.length > 0 ? (
                                        paginatedData.map((row, index) => (
                                            <tr key={row.id || index} className="mc-table-row">
                                                <td>{String((currentPage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</td>
                                                <td className="mc-td-bold">{row.cardNo}</td>
                                                <td>{row.plate || '---'}</td>
                                                <td>{row.customer || 'Khách vãng lai'}</td>
                                                <td>{row.type || 'Xe máy'}</td>
                                                <td>{row.startDate || 'Chưa có'}</td>
                                                <td>{row.endDate || 'Không giới hạn'}</td>
                                                <td>
                                                    <span className={getStatusBadgeClass(row.status)}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="mc-td-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="mc-edit-btn"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                        title="Chỉnh sửa"
                                                        onClick={() => setEditingCard(row)}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mc-renew-btn"
                                                        style={{ color: '#004bca', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        title="Gia hạn"
                                                        onClick={() => setRenewingCard(row)}
                                                        disabled={!row.registrationId || row.status === 'Đã khóa'}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="mc-empty-row">
                                                Không tìm thấy vé tháng phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="mc-pagination-footer">
                            <p className="mc-pagination-info">
                                Hiển thị {filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} của {filteredData.length} kết quả
                            </p>
                            <div className="mc-pagination-controls">
                                <button
                                    className="mc-page-nav"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                {getPageNumbers().map((page, i) => (
                                    page === '...' ? (
                                        <span key={`dots-${i}`} className="mc-page-dots">...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            className={`mc-page-btn ${currentPage === page ? 'mc-page-btn-active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    )
                                ))}
                                <button
                                    className="mc-page-nav"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* COMPONENT DIALOG TẠO MỚI THEO LUỒNG EKYC ĐÃ BỔ SUNG */}
            <CreateMonthCardDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    fetchMonthCards(); // Tải lại bảng dữ liệu sau khi tạo thành công
                }}
            />

            <RenewCardDialog
                isOpen={!!renewingCard}
                onClose={() => setRenewingCard(null)}
                cardData={renewingCard}
                onSuccess={fetchMonthCards}
            />
            <EditMonthCardDialog
                isOpen={!!editingCard}
                onClose={() => setEditingCard(null)}
                cardData={editingCard}
                onSuccess={fetchMonthCards}
            />
        </div>
    );
}