/**
 * Card component cho từng mục quản lý.
 * Props:
 * - title: tiêu đề chức năng
 * - description: nội dung mô tả ngắn
 * - icon: biểu tượng SVG hiển thị bên trái
 */
export default function ManagerCard({ title, description, icon }) {
  return (
    <a href="#" className="card">
      {/* Dùng card-overlay để dễ mở rộng hiệu ứng trong tương lai */}
      <div className="card-overlay" />

      <div className="card-content">
        <div className="card-icon-wrapper">{icon}</div>

        <div className="card-text-block">
          <h3 className="card-title">{title}</h3>
          <p className="card-description desc-clamp">{description}</p>
        </div>
      </div>
    </a>
  )
}
