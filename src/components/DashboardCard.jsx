/**
 * Single dashboard card used in the sample page.
 * Props:
 * - title: card title
 * - description: short description text
 * - icon: material symbol name
 */
export default function DashboardCard({ title, description, icon }) {
  return (
    <article className="card">
      <div className="card-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <div>
        <h3>{title}</h3>
        <p className="card-description desc-clamp">{description}</p>
      </div>
    </article>
  )
}
