/**
 * Topbar component for the dashboard.
 * Displays the page title and user actions on the right.
 */
export default function Topbar({ title, showExtras = false }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>

      <div className="top-actions">
        <button type="button" className="bell" aria-label="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        {showExtras && (
          <>
            <button type="button" className="bell" aria-label="Cài đặt">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button type="button" className="bell" aria-label="Trợ giúp">
              <span className="material-symbols-outlined">help</span>
            </button>
          </>
        )}
        <div className="avatar">AD</div>
      </div>
    </header>
  )
}
