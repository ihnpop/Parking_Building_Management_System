import { useNavigate } from 'react-router-dom'

const occupancyData = [
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
];

export default function GeneralStatisticsTableMonth() {
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
            <h2>Tỷ lệ lấp đầy bãi xe theo tháng</h2>
            <p>Parking Occupancy % over 12 Months</p>
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
            <button>Tuần</button>
            <button className="active">Tháng</button>
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
