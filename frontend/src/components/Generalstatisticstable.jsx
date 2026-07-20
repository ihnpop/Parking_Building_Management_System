const occupancyData = [
  { hour: "00:00", value: 12 },
  { hour: "01:00", value: 8 },
  { hour: "02:00", value: 5 },
  { hour: "03:00", value: 4 },
  { hour: "04:00", value: 10 },
  { hour: "05:00", value: 22 },
  { hour: "06:00", value: 45 },
  { hour: "07:00", value: 72 },
  { hour: "08:00", value: 88 },
  { hour: "09:00", value: 95 },
  { hour: "10:00", value: 92 },
  { hour: "11:00", value: 85 },
  { hour: "12:00", value: 80 },
  { hour: "13:00", value: 82 },
  { hour: "14:00", value: 86 },
  { hour: "15:00", value: 90 },
  { hour: "16:00", value: 94 },
  { hour: "17:00", value: 88 },
  { hour: "18:00", value: 75 },
  { hour: "19:00", value: 60 },
  { hour: "20:00", value: 48 },
  { hour: "21:00", value: 35 },
  { hour: "22:00", value: 25 },
  { hour: "23:00", value: 18 },
];

export default function OccupancyAnalytics() {
  return (
    <div className="occupancy-page">
      <div className="analytics-container">
        <button className="back-button">
          ← Quay lại menu
        </button>

        <div className="page-header">
          <h1>Phân tích tỷ lệ lấp đầy</h1>
          <p>Giám sát thời gian thực và dữ liệu lịch sử bãi đỗ xe.</p>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2>Tỷ lệ lấp đầy bãi xe trong 24 giờ</h2>
            <p>Parking Occupancy % over 24 Hours</p>
          </div>

          <div className="chart-container">
            <div className="y-axis">
              <span>100%</span>
              <span>80%</span>
              <span>60%</span>
              <span>40%</span>
              <span>20%</span>
              <span>0%</span>
            </div>

            <div className="grid-lines">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="grid-line"></div>
              ))}
            </div>

            <div className="bars-wrapper">
              {occupancyData.map((item) => (
                <div key={item.hour} className="bar-group">
                  <div className="bar-inner">
                    <div className="tooltip">{item.value}%</div>
                    <div
                      className="bar"
                      style={{ height: `${item.value}%` }}
                    />
                  </div>
                  <span className="bar-label">{item.hour}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="period-selector">
            <button className="active">Ngày</button>
            <button>Tuần</button>
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
    </div>
  );
}