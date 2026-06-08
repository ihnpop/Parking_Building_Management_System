import { useNavigate } from 'react-router-dom'

const occupancyData = [
  { label: 'Thứ 2', value: 65 },
  { label: 'Thứ 3', value: 72 },
  { label: 'Thứ 4', value: 78 },
  { label: 'Thứ 5', value: 83 },
  { label: 'Thứ 6', value: 90 },
  { label: 'Thứ 7', value: 70 },
  { label: 'Chủ nhật', value: 60 },
];

export default function GeneralStatisticsTableWeek() {
  const navigate = useNavigate()

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
            <h2>Tỷ lệ lấp đầy bãi xe trong tuần</h2>
            <p>Parking Occupancy % over 7 Days</p>
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
              {occupancyData.map((item) => (
                <div key={item.label} className="bar-group">
                  <div className="bar-inner">
                    <div className="tooltip">{item.value}%</div>
                    <div className="bar" style={{ height: `${item.value}%` }} />
                  </div>
                  <span className="bar-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="period-selector">
            <button>Ngày</button>
            <button className="active">Tuần</button>
            <button>Tháng</button>
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
