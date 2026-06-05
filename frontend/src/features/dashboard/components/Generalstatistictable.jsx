/**
 * Static parking occupancy chart for a 24-hour period.
 * UI-only React component without backend logic.
 */

import { useNavigate } from 'react-router-dom'

const occupancyData = [
    { hour: '00:00', value: 5 },
    { hour: '01:00', value: 4 },
    { hour: '02:00', value: 4 },
    { hour: '03:00', value: 6 },
    { hour: '04:00', value: 10 },
    { hour: '05:00', value: 15 },
    { hour: '06:00', value: 25 },
    { hour: '07:00', value: 55 },
    { hour: '08:00', value: 85 },
    { hour: '09:00', value: 92 },
    { hour: '10:00', value: 90 },
    { hour: '11:00', value: 88 },
    { hour: '12:00', value: 94 },
    { hour: '13:00', value: 96 },
    { hour: '14:00', value: 95 },
    { hour: '15:00', value: 93 },
    { hour: '16:00', value: 91 },
    { hour: '17:00', value: 89 },
    { hour: '18:00', value: 75 },
    { hour: '19:00', value: 60 },
    { hour: '20:00', value: 45 },
    { hour: '21:00', value: 30 },
    { hour: '22:00', value: 20 },
    { hour: '23:00', value: 15 },
];

export default function GeneralStatisticsTable() {
    return (
        <section className="occupancy-chart-page">
            <div className="occupancy-chart-card">
                <div className="occupancy-chart-title-group">
                    <p className="occupancy-chart-label">Tỷ lệ lấp đầy bãi xe trong 24 giờ</p>
                    <h1 className="occupancy-chart-title">Parking Occupancy % over 24 Hours</h1>
                </div>

                <div className="occupancy-chart-area">
                    <div className="occupancy-chart-y-axis">
                        {[100, 80, 60, 40, 20, 0].map((label) => (
                            <span key={label} className="occupancy-y-label">
                                {label}%
                            </span>
                        ))}
                    </div>

                    <div className="occupancy-chart-inner">
                        <div className="occupancy-chart-grid-lines">
                            {[100, 80, 60, 40, 20, 0].map((label) => (
                                <div key={label} className="occupancy-grid-line" />
                            ))}
                        </div>

                        <div className="occupancy-chart-bars">
                            {occupancyData.map((item) => (
                                <div key={item.hour} className="occupancy-bar-column">
                                    <div className="occupancy-bar-wrapper">
                                        <div
                                            className="occupancy-bar"
                                            style={{ height: `${item.value * 2.5}px` }}>
                                            <span className="bar-value-inside">{item.value}%</span>
                                        </div>
                                    </div>
                                    <div className="bar-hour-label">{item.hour}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="occupancy-chart-legend">
                    <span />
                    <span>Occupancy Percentage</span>
                </div>
            </div>
        </section>
    )
}