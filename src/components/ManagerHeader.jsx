/**
 * Header cho trang quản lý.
 * Hiển thị logo, tên hệ thống và phần hiển thị người dùng.
 */
export default function ManagerHeader() {
  return (
    <header className="manager-header">
      <div className="container header-inner">
        <div className="brand-row">
          {/* Logo hiển thị vùng màu cam và icon cho bảng điều khiển */}
          <div className="brand-logo">
            <svg
              className="brand-logo-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Tiêu đề chính của dashboard */}
          <div>
            <h1 className="manager-title">Hệ thống Quản lý Bãi xe</h1>
          </div>
        </div>

        <div className="header-actions">
          {/* Nút thông báo / hành động của người quản lý */}
          <button className="icon-button" aria-label="Notifications">
            <svg
              className="icon-button-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Avatar người dùng tạm thời */}
          <div className="profile-avatar">AD</div>
        </div>
      </div>
    </header>
  )
}
