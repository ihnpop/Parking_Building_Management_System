/**
 * SystemOperations hiển thị giao diện mẫu cho tab nghiệp vụ hệ thống.
 * Nội dung này chỉ xuất hiện khi người dùng chọn tab "Nghiệp vụ hệ thống".
 */
const cameraCards = [
    {
        title: 'Camera 01 - Toàn cảnh',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDM7hJvEzwj5N8Ecltn_8mNmwCmHC40GPQLUzrPpYJ3Tljm187mQfYN7L2m5AQPX-Z23j1SiukOmWd5mZYS3zwDxGw4zGLe-aLWV6n3yP73FpIXiraqm_cL0Bsy4dN7KpnJQ1SWrczGDUq8JFEQfBzQSLPHpZbEVZyMlaP9VA75RK12SP-5oXHNPf5wNWvnd6Ni7pD_m5VR7e0bfHXaTvRnvwsnV7yzY92x1E-qo4kdpJp473Clxs7tzSKXNTz_tDSx953gGoukxvk',
        badge: 'REC',
        badgeClass: 'camera-badge-record',
    },
    {
        title: 'Camera 02 - Biển số',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBY_qQ9w1hTwomzRMVxQ_cRALiO7poUpyGH1d3L0BBc0z08g2A6uhN9AdQexl9JYb6VtLi2iuOqTbW3DSJotPZxrJllI0aHC5CPNpLQTmD8UIekVaSmP79O8332EpfIlwC1L22wcXGMvEmYrBRIGbaGtSZGflODD7zMesEs_nUSi8ncvTapJXU9_ntgQdVTCK2CposjUZXTOC40qJ4OMb_eccDmW7JE2u59YBJxOp_x_Mz97TbHeh_hwM1Oczzwci2Qmyhd0XFTHno',
    },
    {
        title: 'Camera 03 - Toàn cảnh OUT',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB1utp_U-WKcOZcqCWl6rsHwW8kbASOtTw-vaMhAXERRCZZJm_e2ID2rxbr2zJLynsq0_FL_FHGiGQmxl4wHqA-Ucn3socPr0SK3g0C3yYR-j52-rjoyYe-upJtUXBGHJGLzvuf9l21-GFQ76XBhf1upX4OhAneef7Rg9UdMz0PGryoBCMISIAEhfFc-2N_FjpDI85Rap0ZWoZ69pV5DFYw45Zoq0Ia3er1pH-lQsAxdBPLMIBktImLUiGSL-80wfLmNrtgzTlA-jw',
    },
    {
        title: 'Camera 04 - Biển số OUT',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDJCOcqayYGfaWqXDR4TjBRcDUAGQyuvhkTCQ3r2Ivprb_szJonOqtBHW-ICNPYfFv97j3bVpHhH-WnSA4aS2MCIYAuo40ZbNe02ndW35ycuxzb_SF9PEYBs5oL0UVMatcLg6wI6fohgpgo1GWmXT4eX2ujtuTCWlPYYZBc88zmIKNCnhQ8mGiDg5muXtxL4-loBashck6sklVinfS5HN2mCsxrgS2gT725B0SaQ6_FovbCcTfINamNS7eRSyYTR8rsROnXGYm3pdU',
    },
]

const actionShortcuts = [
    { label: 'F1', text: 'Thống kê', primary: false },
    { label: 'F2', text: 'Tìm kiếm', primary: false },
    { label: 'ENTER', text: 'Cho xe ra', primary: true },
]

export default function SystemOperations() {
    return (
        <div className="system-page">
            {/* Topbar is provided by the shell - avoid rendering a second header here to prevent duplication */}

            <main className="system-content">
                <section className="stats-grid">
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Số lượng xe trong bãi</p>
                            <p className="stat-value">142</p>
                        </div>
                        <div className="stat-icon stat-icon-primary">
                            <span className="material-symbols-outlined">local_parking</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã vào</p>
                            <p className="stat-value">350</p>
                        </div>
                        <div className="stat-icon stat-icon-secondary">
                            <span className="material-symbols-outlined">login</span>
                        </div>
                    </article>
                    <article className="stat-card">
                        <div className="stat-card-text">
                            <p className="stat-label">Xe đã ra</p>
                            <p className="stat-value">208</p>
                        </div>
                        <div className="stat-icon stat-icon-tertiary">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                    </article>
                </section>

                <section className="camera-grid">
                    {cameraCards.map((camera) => (
                        <article key={camera.title} className="camera-card">
                            <div className="camera-image" style={{ backgroundImage: `url(${camera.image})` }}>
                                <span className="camera-label">{camera.title}</span>
                                {camera.badge && <span className={`camera-badge ${camera.badgeClass}`}>{camera.badge}</span>}
                            </div>
                        </article>
                    ))}
                </section>

                <section className="active-transaction">
                    <div className="transaction-highlight">
                        <p className="transaction-label">Biển số xe</p>
                        <div className="transaction-plate">29A - 123.45</div>
                        <div className="transaction-status">Chờ thanh toán</div>
                    </div>
                    <div className="transaction-details">
                        <div className="transaction-row">
                            <div className="transaction-row-label">
                                <span className="material-symbols-outlined">login</span>
                                Thời gian vào:
                            </div>
                            <div className="transaction-row-value">08:15 12/10/2023</div>
                        </div>
                        <div className="transaction-row">
                            <div className="transaction-row-label">
                                <span className="material-symbols-outlined">logout</span>
                                Thời gian ra:
                            </div>
                            <div className="transaction-row-value">17:30 12/10/2023</div>
                        </div>
                        <div className="transaction-row transaction-total">
                            <div className="transaction-row-label">Giá tiền:</div>
                            <div className="transaction-row-value transaction-price">15,000 VNĐ</div>
                        </div>
                    </div>
                </section>

                <section className="shortcut-row">
                    {actionShortcuts.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            className={action.primary ? 'shortcut-button shortcut-primary' : 'shortcut-button'}
                        >
                            <span className="shortcut-key">{action.label}</span>
                            <span>{action.text}</span>
                        </button>
                    ))}
                </section>
            </main>

            <footer className="system-footer">
                <p>© 2024 Parking Building Management Systems. All rights reserved.</p>
                <div className="footer-links">
                    <a href="#">Privacy Policy</a>
                    <a href="#">Support</a>
                    <a href="#">System Status</a>
                </div>
            </footer>
        </div>
    )
}