import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const chartData = {
    day: {
        title: 'Tỷ lệ lấp đầy bãi xe trong 24 giờ',
        subtitle: 'Parking Occupancy % over 24 Hours',
        data: [
            { label: '00:00', value: 12 },
            { label: '01:00', value: 8 },
            { label: '02:00', value: 5 },
            { label: '03:00', value: 4 },
            { label: '04:00', value: 10 },
            { label: '05:00', value: 22 },
            { label: '06:00', value: 45 },
            { label: '07:00', value: 72 },
            { label: '08:00', value: 88 },
            { label: '09:00', value: 95 },
            { label: '10:00', value: 92 },
            { label: '11:00', value: 85 },
            { label: '12:00', value: 80 },
            { label: '13:00', value: 82 },
            { label: '14:00', value: 86 },
            { label: '15:00', value: 90 },
            { label: '16:00', value: 94 },
            { label: '17:00', value: 88 },
            { label: '18:00', value: 75 },
            { label: '19:00', value: 60 },
            { label: '20:00', value: 48 },
            { label: '21:00', value: 35 },
            { label: '22:00', value: 25 },
            { label: '23:00', value: 18 },
        ],
    },
    week: {
        title: 'Tỷ lệ lấp đầy bãi xe trong tuần',
        subtitle: 'Parking Occupancy % over 7 Days',
        data: [
            { label: 'Thứ 2', value: 65 },
            { label: 'Thứ 3', value: 72 },
            { label: 'Thứ 4', value: 78 },
            { label: 'Thứ 5', value: 83 },
            { label: 'Thứ 6', value: 90 },
            { label: 'Thứ 7', value: 70 },
            { label: 'Chủ nhật', value: 60 },
        ],
    },
    month: {
        title: 'Tỷ lệ lấp đầy bãi xe theo tháng',
        subtitle: 'Parking Occupancy % over 12 Months',
        data: [
            { label: 'Thg 1', value: 40 },
            { label: 'Thg 2', value: 45 },
            { label: 'Thg 3', value: 55 },
            { label: 'Thg 4', value: 62 },
            { label: 'Thg 5', value: 70 },
            { label: 'Thg 6', value: 78 },
            { label: 'Thg 7', value: 84 },
            { label: 'Thg 8', value: 88 },
            { label: 'Thg 9', value: 82 },
            { label: 'Thg 10', value: 75 },
            { label: 'Thg 11', value: 64 },
            { label: 'Thg 12', value: 58 },
        ],
    },
}

export default function OccupancyChart() {
    const [selectedPeriod, setSelectedPeriod] = useState('day')
    const navigate = useNavigate()

    const current = chartData[selectedPeriod]

    return (
        <section className="occupancy-page">
            <div className="analytics-container">
                <button className="back-button" onClick={() => navigate('/login/dashboard')}>
                    ← Quay về menu
                </button>

                <div className="page-header">
                    <h1>Phân tích tỷ lệ lấp đầy</h1>
                    <p>Giám sát thời gian thực và dữ liệu lịch sử bãi đỗ xe.</p>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h2>{current.title}</h2>
                        <p>{current.subtitle}</p>
                    </div>

                    <div className="chart-container">
                        <div className="y-axis">
                            {[100, 80, 60, 40, 20, 0].map((label) => (
                                <span key={label}>{label}%</span>
                            ))}
                        </div>

                        <div className="grid-lines">
                            {[...Array(6)].map((_, index) => (
                                <div key={index} className="grid-line"></div>
                            ))}
                        </div>

                        <div className="bars-wrapper">
                            {current.data.map((item) => (
                                <div key={item.label} className="bar-group">
                                    <div className="bar-inner">
                                        <div className="bar" style={{ height: `${item.value}%` }}>
                                            <div className="tooltip">{item.value}%</div>
                                        </div>
                                    </div>
                                    <span className="bar-label">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="period-selector">
                        <button
                            className={selectedPeriod === 'day' ? 'active' : ''}
                            onClick={() => setSelectedPeriod('day')}
                        >
                            Ngày
                        </button>
                        <button
                            className={selectedPeriod === 'week' ? 'active' : ''}
                            onClick={() => setSelectedPeriod('week')}
                        >
                            Tuần
                        </button>
                        <button
                            className={selectedPeriod === 'month' ? 'active' : ''}
                            onClick={() => setSelectedPeriod('month')}
                        >
                            Tháng
                        </button>
                    </div>

                    <div className="legend">
                        <div className="legend-color"></div>
                        <span>Occupancy Percentage</span>
                    </div>
                </div>

                <div className="summary-grid">
                    <div className="summary-card">
                        <div className="summary-icon">⏰</div>
                        <div>
                            <p>Giờ cao điểm</p>
                            <h3>08:00 - 10:00</h3>
                        </div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-icon">📊</div>
                        <div>
                            <p>Công suất trung bình</p>
                            <h3>68.5%</h3>
                        </div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-icon">✅</div>
                        <div>
                            <p>Trạng thái hiện tại</p>
                            <h3>42/100 chỗ trống</h3>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
